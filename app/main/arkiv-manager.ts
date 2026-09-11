// app/main/arkiv-manager.ts
//
// Arkiv Network integration for persistent encrypted message storage.
//
// @arkiv-network/sdk is not yet published to npm.
// All methods are stubbed and return null/empty gracefully.
// Gate: process.env.WEAVE_ARKIV_ENABLED === 'true' must be set to activate;
// without it all methods no-op immediately.
//
// When the SDK becomes available, replace the stub body with the full
// implementation from the docs (§5 Task 2).

import type { WrappedKey } from './crypto/channel-crypto.js'
import {
  wrapChannelKey,
  unwrapChannelKey,
  encryptMessage,
  decryptMessage,
  deriveDmKey,
  deriveChannelKey,
} from './crypto/channel-crypto.js'

// Re-export so callers don't need a separate import for the key helper.
export { deriveChannelKey }

// ── Shared result types ────────────────────────────────────────────────────────

export interface ArkivMessage {
  id: string
  sender: string
  timestamp: number
  text: string
}

export interface ArkivDM extends ArkivMessage {
  mine: boolean
}

export interface ChannelMemberRecord {
  member: string
  role: string
}

// ── Feature flag ──────────────────────────────────────────────────────────────

const ARKIV_ENABLED = process.env.WEAVE_ARKIV_ENABLED === 'true'

// ── ArkivManager ──────────────────────────────────────────────────────────────

export class ArkivManager {
  // Attempt to load the SDK lazily. Will remain null if the package is absent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private walletClient: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private publicClient: any = null

  private blocksPerDay = 5760  // fallback: ~15 s blocks
  private keyCache     = new Map<string, Uint8Array>()

  constructor(private readonly spendPrivHex: `0x${string}`) {}

  async init(): Promise<void> {
    if (!ARKIV_ENABLED) return

    try {
      // Dynamic import so the absence of the package only throws here, not at
      // module load time. If the SDK ships, this will resolve correctly.
      const sdk = await import('@arkiv-network/sdk' as string)
      const { http } = await import('viem')
      const { privateKeyToAccount } = await import('viem/accounts')

      const tiramisu = sdk.tiramisu ?? sdk.chains?.tiramisu
      const account  = privateKeyToAccount(this.spendPrivHex)

      this.walletClient = sdk.createWalletClient({
        chain:     tiramisu,
        transport: http(),
        account,
      })
      this.publicClient = sdk.createPublicClient({
        chain:     tiramisu,
        transport: http(),
      })

      // Calibrate blocks-per-day from chain timing
      try {
        const timing = await this.publicClient.request({
          method: 'arkiv_getBlockTiming',
          params: [],
        })
        if (timing?.blockDuration) {
          this.blocksPerDay = Math.round(86400 / timing.blockDuration)
        }
      } catch { /* use default */ }
    } catch (err) {
      console.warn('[arkiv] SDK unavailable — Arkiv persistence disabled:', err)
      this.walletClient = null
      this.publicClient = null
    }
  }

  // ── Channel key management ──────────────────────────────────────────────────

  /**
   * Store a wrapped copy of K_channel for a member.
   * Admin calls this once per member when creating or rotating a channel key.
   */
  async storeChannelKey(
    org: string,
    channel: string,
    recipient: string,
    keyVersion: number,
    K_channel: Uint8Array,
    memberNoisePub: Uint8Array,
    adminNoisePriv: Uint8Array,
  ): Promise<void> {
    if (!ARKIV_ENABLED || !this.walletClient) return

    try {
      const wrapped  = wrapChannelKey(adminNoisePriv, memberNoisePub, K_channel)
      const payload  = JSON.stringify(wrapped)
      await this.walletClient.createEntity({
        payload:     Buffer.from(payload),
        contentType: 'application/json',
        attributes: [
          { name: 'type',       value: { str: 'channel-key' } },
          { name: 'org',        value: { str: org } },
          { name: 'channel',    value: { str: channel } },
          { name: 'recipient',  value: { str: recipient } },
          { name: 'keyVersion', value: { i32: keyVersion } },
        ],
      })
    } catch (err) {
      console.warn('[arkiv] storeChannelKey failed:', err)
    }
  }

  /**
   * Fetch and unwrap this member's channel key from Arkiv.
   * Returns null if not found or decryption fails.
   */
  async fetchChannelKey(
    org: string,
    channel: string,
    recipientLabel: string,
    keyVersion: number,
    memberNoisePriv: Uint8Array,
  ): Promise<Uint8Array | null> {
    if (!ARKIV_ENABLED || !this.publicClient) return null

    const cacheKey = `${org}/${channel}/${keyVersion}`
    if (this.keyCache.has(cacheKey)) return this.keyCache.get(cacheKey)!

    try {
      const query   = `type = str('channel-key') AND org = str('${org}') AND channel = str('${channel}') AND recipient = str('${recipientLabel}') AND keyVersion = i32(${keyVersion})`
      const results = await this._query(query, { limit: 1 })
      if (!results.length) return null

      const wrapped: WrappedKey = JSON.parse(Buffer.from(results[0].payload as Uint8Array).toString('utf8'))
      const K_channel            = unwrapChannelKey(memberNoisePriv, wrapped)
      this.keyCache.set(cacheKey, K_channel)
      return K_channel
    } catch (err) {
      console.warn('[arkiv] fetchChannelKey failed:', err)
      return null
    }
  }

  /** Return the latest keyVersion stored for a recipient in a channel. -1 if none. */
  async getLatestKeyVersion(
    org: string,
    channel: string,
    recipientLabel: string,
  ): Promise<number> {
    if (!ARKIV_ENABLED || !this.publicClient) return -1

    try {
      const query   = `type = str('channel-key') AND org = str('${org}') AND channel = str('${channel}') AND recipient = str('${recipientLabel}')`
      const results = await this._query(query, { limit: 100, orderBy: 'keyVersion DESC' })
      if (!results.length) return -1
      const attrs = results[0].attributes as Record<string, unknown>
      return Number(attrs['keyVersion'] ?? 0)
    } catch (err) {
      console.warn('[arkiv] getLatestKeyVersion failed:', err)
      return -1
    }
  }

  // ── Message storage ─────────────────────────────────────────────────────────

  /** Encrypt and store a channel message. Returns the Arkiv entity key or empty string. */
  async postMessage(
    org: string,
    channel: string,
    senderLabel: string,
    K_channel: Uint8Array,
    keyVersion: number,
    plaintext: string,
    expiryDays = 30,
  ): Promise<string> {
    if (!ARKIV_ENABLED || !this.walletClient) return ''

    try {
      const enc     = encryptMessage(K_channel, new TextEncoder().encode(plaintext))
      const payload = JSON.stringify({ ...enc, contentType: 'text/plain' })

      const entityKey = await this.walletClient.createEntity({
        payload:           Buffer.from(payload),
        contentType:       'application/json',
        attributes: [
          { name: 'type',       value: { str: 'message' } },
          { name: 'org',        value: { str: org } },
          { name: 'channel',    value: { str: channel } },
          { name: 'sender',     value: { str: senderLabel } },
          { name: 'timestamp',  value: { u64: BigInt(Date.now()) } },
          { name: 'keyVersion', value: { i32: keyVersion } },
        ],
        expireAfterBlocks: this.blocksPerDay * expiryDays,
      })
      return entityKey as string
    } catch (err) {
      console.warn('[arkiv] postMessage failed:', err)
      return ''
    }
  }

  /** Fetch and decrypt channel messages since sinceTimestamp. */
  async fetchMessages(
    org: string,
    channel: string,
    sinceTimestamp: number,
    K_channel: Uint8Array,
  ): Promise<ArkivMessage[]> {
    if (!ARKIV_ENABLED || !this.publicClient) return []

    try {
      const query      = `type = str('message') AND org = str('${org}') AND channel = str('${channel}') AND timestamp > u64(${sinceTimestamp})`
      const rawEntities = await this._query(query, { limit: 200 })
      const messages: ArkivMessage[] = []

      for (const entity of rawEntities) {
        try {
          const parsed = JSON.parse(Buffer.from(entity.payload as Uint8Array).toString('utf8')) as {
            iv: string; ciphertext: string; contentType: string
          }
          if (parsed.contentType !== 'text/plain') continue
          const plain = decryptMessage(K_channel, parsed.iv, parsed.ciphertext)
          const attrs = entity.attributes as Record<string, unknown>
          messages.push({
            id:        String(entity.key),
            sender:    String(attrs['sender'] ?? ''),
            timestamp: Number(attrs['timestamp'] ?? 0),
            text:      new TextDecoder().decode(plain),
          })
        } catch { /* skip undecryptable — different keyVersion or corrupt */ }
      }

      return messages.sort((a, b) => a.timestamp - b.timestamp)
    } catch (err) {
      console.warn('[arkiv] fetchMessages failed:', err)
      return []
    }
  }

  // ── DM storage ──────────────────────────────────────────────────────────────

  /** Encrypt and store a DM. Returns the Arkiv entity key or empty string. */
  async postDM(
    org: string,
    senderLabel: string,
    recipientLabel: string,
    myNoisePriv: Uint8Array,
    peerNoisePub: Uint8Array,
    plaintext: string,
    expiryDays = 30,
  ): Promise<string> {
    if (!ARKIV_ENABLED || !this.walletClient) return ''

    try {
      const dmKey   = deriveDmKey(myNoisePriv, peerNoisePub)
      const enc     = encryptMessage(dmKey, new TextEncoder().encode(plaintext))
      const payload = JSON.stringify({ ...enc, contentType: 'text/plain' })

      const entityKey = await this.walletClient.createEntity({
        payload:           Buffer.from(payload),
        contentType:       'application/json',
        attributes: [
          { name: 'type',       value: { str: 'dm-message' } },
          { name: 'org',        value: { str: org } },
          { name: 'sender',     value: { str: senderLabel } },
          { name: 'recipient',  value: { str: recipientLabel } },
          { name: 'timestamp',  value: { u64: BigInt(Date.now()) } },
          { name: 'keyVersion', value: { i32: 1 } },
        ],
        expireAfterBlocks: this.blocksPerDay * expiryDays,
      })
      return entityKey as string
    } catch (err) {
      console.warn('[arkiv] postDM failed:', err)
      return ''
    }
  }

  /** Fetch and decrypt DMs with a peer (both sent and received). */
  async fetchDMs(
    org: string,
    myLabel: string,
    peerLabel: string,
    sinceTimestamp: number,
    myNoisePriv: Uint8Array,
    peerNoisePub: Uint8Array,
  ): Promise<ArkivDM[]> {
    if (!ARKIV_ENABLED || !this.publicClient) return []

    try {
      const dmKey       = deriveDmKey(myNoisePriv, peerNoisePub)
      const qIncoming   = `type = str('dm-message') AND org = str('${org}') AND sender = str('${peerLabel}') AND recipient = str('${myLabel}') AND timestamp > u64(${sinceTimestamp})`
      const qOutgoing   = `type = str('dm-message') AND org = str('${org}') AND sender = str('${myLabel}') AND recipient = str('${peerLabel}') AND timestamp > u64(${sinceTimestamp})`

      const [incoming, outgoing] = await Promise.all([
        this._query(qIncoming, { limit: 200 }),
        this._query(qOutgoing, { limit: 200 }),
      ])

      type RawEntity = { key: unknown; payload: Uint8Array; attributes: Record<string, unknown> }

      const decode = (entities: RawEntity[], mine: boolean): ArkivDM[] =>
        entities.flatMap(e => {
          try {
            const parsed = JSON.parse(Buffer.from(e.payload).toString('utf8')) as {
              iv: string; ciphertext: string
            }
            const plain = decryptMessage(dmKey, parsed.iv, parsed.ciphertext)
            return [{
              id:        String(e.key),
              sender:    String(e.attributes['sender'] ?? ''),
              timestamp: Number(e.attributes['timestamp'] ?? 0),
              text:      new TextDecoder().decode(plain),
              mine,
            }]
          } catch { return [] }
        })

      return [
        ...decode(incoming as RawEntity[], false),
        ...decode(outgoing as RawEntity[], true),
      ].sort((a, b) => a.timestamp - b.timestamp)
    } catch (err) {
      console.warn('[arkiv] fetchDMs failed:', err)
      return []
    }
  }

  // ── Channel membership ───────────────────────────────────────────────────────

  /** Record a channel member on Arkiv. */
  async addChannelMember(
    org: string,
    channel: string,
    member: string,
    role: 'admin' | 'member',
  ): Promise<void> {
    if (!ARKIV_ENABLED || !this.walletClient) return

    try {
      await this.walletClient.createEntity({
        payload:     Buffer.from('{}'),
        contentType: 'application/json',
        attributes: [
          { name: 'type',    value: { str: 'channel-member' } },
          { name: 'org',     value: { str: org } },
          { name: 'channel', value: { str: channel } },
          { name: 'member',  value: { str: member } },
          { name: 'role',    value: { str: role } },
        ],
      })
    } catch (err) {
      console.warn('[arkiv] addChannelMember failed:', err)
    }
  }

  /** List all members of a channel stored on Arkiv. */
  async listChannelMembers(org: string, channel: string): Promise<ChannelMemberRecord[]> {
    if (!ARKIV_ENABLED || !this.publicClient) return []

    try {
      const query   = `type = str('channel-member') AND org = str('${org}') AND channel = str('${channel}')`
      const results = await this._query(query, { limit: 500 })
      return results.map((e: { attributes: Record<string, unknown> }) => ({
        member: String(e.attributes['member'] ?? ''),
        role:   String(e.attributes['role']   ?? 'member'),
      }))
    } catch (err) {
      console.warn('[arkiv] listChannelMembers failed:', err)
      return []
    }
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  private async _query(
    query: string,
    opts: { limit?: number; cursor?: string; orderBy?: string } = {},
  ): Promise<{ key: unknown; payload: Uint8Array; attributes: Record<string, unknown> }[]> {
    const params: Record<string, unknown> = {
      query,
      select: ['payload', 'attributes'],
      limit:  opts.limit ?? 100,
    }
    if (opts.cursor)  params['cursor']  = opts.cursor
    if (opts.orderBy) params['orderBy'] = opts.orderBy

    const response = await this.publicClient.request({
      method: 'arkiv_query',
      params: [params],
    })
    return (response?.entities ?? []) as { key: unknown; payload: Uint8Array; attributes: Record<string, unknown> }[]
  }
}
