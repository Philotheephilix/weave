// app/main/arkiv-manager.ts
//
// Arkiv Network integration for persistent encrypted message storage.
// Uses @arkiv-network/sdk 0.8 against the tiramisu testnet.
//
// SDK is loaded via dynamic import() inside init() so module-load failures
// do not crash the Electron main process.

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

// ── ArkivManager ──────────────────────────────────────────────────────────────

export class ArkivManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private walletClient: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private publicClient: any = null

  private keyCache = new Map<string, Uint8Array>()

  constructor(private readonly spendPrivHex: `0x${string}`) {}

  async init(): Promise<void> {
    try {
      // Dynamic import so startup is not blocked by an SDK import error.
      const sdk = await import('@arkiv-network/sdk')
      const { tiramisu } = await import('@arkiv-network/sdk/chains')
      const { http } = await import('viem')
      const { privateKeyToAccount } = await import('viem/accounts')

      const { createPublicClient, createWalletClient } = sdk

      const account = privateKeyToAccount(this.spendPrivHex)

      this.walletClient = createWalletClient({
        chain: tiramisu,
        transport: http(),
        account,
      })
      this.publicClient = createPublicClient({
        chain: tiramisu,
        transport: http(),
      })
    } catch (err) {
      console.warn('[arkiv] SDK init failed — Arkiv persistence disabled:', err)
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
    if (!this.walletClient) return

    try {
      const { ExpirationTime, jsonToPayload } = await import('@arkiv-network/sdk')
      const { str, u64 } = await import('@arkiv-network/sdk/attr')

      const wrapped = wrapChannelKey(adminNoisePriv, memberNoisePub, K_channel)

      await this.walletClient.createEntity({
        payload: jsonToPayload(wrapped as unknown as object),
        contentType: 'application/json',
        attributes: {
          project: str('weave-v1'),
          type: str('channel-key'),
          org: str(org),
          channel: str(channel),
          recipient: str(recipient),
          key_version: u64(BigInt(keyVersion)),
        },
        expires: ExpirationTime.fromDays(365),
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
    if (!this.publicClient) return null

    const cacheKey = `${org}/${channel}/${keyVersion}`
    if (this.keyCache.has(cacheKey)) return this.keyCache.get(cacheKey)!

    try {
      const { eq, and } = await import('@arkiv-network/sdk/query')
      const { str, u64 } = await import('@arkiv-network/sdk/attr')

      const result = await this.publicClient
        .select({ key: true, payload: true, attributes: true })
        .where(
          and(
            eq('project', str('weave-v1')),
            eq('type', str('channel-key')),
            eq('org', str(org)),
            eq('channel', str(channel)),
            eq('recipient', str(recipientLabel)),
            eq('key_version', u64(BigInt(keyVersion))),
          ),
        )
        .limit(1)
        .fetch()

      const entity = result.entities[0]
      if (!entity) return null

      // entity.toJson() decodes the Uint8Array payload as JSON
      const wrapped: WrappedKey = entity.toJson != null
        ? (entity.toJson() as WrappedKey)
        : (JSON.parse(new TextDecoder().decode(entity.payload as Uint8Array)) as WrappedKey)

      const K_channel = unwrapChannelKey(memberNoisePriv, wrapped)
      this.keyCache.set(cacheKey, K_channel)
      return K_channel
    } catch (err) {
      console.warn('[arkiv] fetchChannelKey failed:', err)
      return null
    }
  }

  /** Return the latest key_version stored for a recipient in a channel. -1 if none. */
  async getLatestKeyVersion(
    org: string,
    channel: string,
    recipientLabel: string,
  ): Promise<number> {
    if (!this.publicClient) return -1

    try {
      const { eq, and } = await import('@arkiv-network/sdk/query')
      const { str } = await import('@arkiv-network/sdk/attr')

      let result = await this.publicClient
        .select({ key: true, attributes: true })
        .where(
          and(
            eq('project', str('weave-v1')),
            eq('type', str('channel-key')),
            eq('org', str(org)),
            eq('channel', str(channel)),
            eq('recipient', str(recipientLabel)),
          ),
        )
        .limit(200)
        .fetch()

      type AttrEntity = { attributes: Record<string, { value: unknown }> }
      const entities: AttrEntity[] = [...(result.entities as AttrEntity[])]
      while (result.hasNextPage()) {
        result = await result.next()
        entities.push(...(result.entities as AttrEntity[]))
      }

      if (!entities.length) return -1

      let max = -1
      for (const e of entities) {
        const raw = e.attributes?.['key_version']?.value
        const v = raw !== undefined ? Number(raw) : -1
        if (v > max) max = v
      }
      return max
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
    if (!this.walletClient) return ''

    try {
      const { ExpirationTime, jsonToPayload } = await import('@arkiv-network/sdk')
      const { str, u64 } = await import('@arkiv-network/sdk/attr')

      const enc = encryptMessage(K_channel, new TextEncoder().encode(plaintext))

      const { entityKey } = await this.walletClient.createEntity({
        payload: jsonToPayload({ ...enc, contentType: 'text/plain' }),
        contentType: 'application/json',
        attributes: {
          project: str('weave-v1'),
          type: str('channel-message'),
          org: str(org),
          channel: str(channel),
          sender: str(senderLabel),
          created_ms: u64(BigInt(Date.now())),
          key_version: u64(BigInt(keyVersion)),
        },
        expires: ExpirationTime.fromDays(expiryDays),
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
    if (!this.publicClient) return []

    try {
      const { eq, and, gte } = await import('@arkiv-network/sdk/query')
      const { str, u64 } = await import('@arkiv-network/sdk/attr')

      type RawE = {
        key: unknown
        payload: unknown
        attributes: Record<string, { value: unknown }>
        toJson?: () => unknown
      }

      let result = await this.publicClient
        .select({ key: true, payload: true, attributes: true })
        .where(
          and(
            eq('project', str('weave-v1')),
            eq('type', str('channel-message')),
            eq('org', str(org)),
            eq('channel', str(channel)),
            gte('created_ms', u64(BigInt(sinceTimestamp))),
          ),
        )
        .limit(200)
        .fetch()

      const rawEntities: RawE[] = [...(result.entities as RawE[])]
      while (result.hasNextPage()) {
        result = await result.next()
        rawEntities.push(...(result.entities as RawE[]))
      }

      const messages: ArkivMessage[] = []
      for (const entity of rawEntities) {
        try {
          const parsed = entity.toJson != null
            ? (entity.toJson() as { iv: string; ciphertext: string; contentType: string })
            : (JSON.parse(new TextDecoder().decode(entity.payload as Uint8Array)) as { iv: string; ciphertext: string; contentType: string })
          if (parsed.contentType !== 'text/plain') continue
          const plain = decryptMessage(K_channel, parsed.iv, parsed.ciphertext)
          messages.push({
            id: String(entity.key),
            sender: String(entity.attributes['sender']?.value ?? ''),
            timestamp: Number(entity.attributes['created_ms']?.value ?? 0),
            text: new TextDecoder().decode(plain),
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
    if (!this.walletClient) return ''

    try {
      const { ExpirationTime, jsonToPayload } = await import('@arkiv-network/sdk')
      const { str, u64 } = await import('@arkiv-network/sdk/attr')

      const dmKey = deriveDmKey(myNoisePriv, peerNoisePub)
      const enc = encryptMessage(dmKey, new TextEncoder().encode(plaintext))

      const { entityKey } = await this.walletClient.createEntity({
        payload: jsonToPayload({ ...enc, contentType: 'text/plain' }),
        contentType: 'application/json',
        attributes: {
          project: str('weave-v1'),
          type: str('dm-message'),
          org: str(org),
          sender: str(senderLabel),
          recipient: str(recipientLabel),
          created_ms: u64(BigInt(Date.now())),
        },
        expires: ExpirationTime.fromDays(expiryDays),
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
    if (!this.publicClient) return []

    try {
      const { eq, and, gte } = await import('@arkiv-network/sdk/query')
      const { str, u64 } = await import('@arkiv-network/sdk/attr')

      const dmKey = deriveDmKey(myNoisePriv, peerNoisePub)
      const since = gte('created_ms', u64(BigInt(sinceTimestamp)))

      type RawE = {
        key: unknown
        payload: unknown
        attributes: Record<string, { value: unknown }>
        toJson?: () => unknown
      }

      const [inResult, outResult] = await Promise.all([
        this.publicClient
          .select({ key: true, payload: true, attributes: true })
          .where(
            and(
              eq('project', str('weave-v1')),
              eq('type', str('dm-message')),
              eq('org', str(org)),
              eq('sender', str(peerLabel)),
              eq('recipient', str(myLabel)),
              since,
            ),
          )
          .limit(200)
          .fetch(),
        this.publicClient
          .select({ key: true, payload: true, attributes: true })
          .where(
            and(
              eq('project', str('weave-v1')),
              eq('type', str('dm-message')),
              eq('org', str(org)),
              eq('sender', str(myLabel)),
              eq('recipient', str(peerLabel)),
              since,
            ),
          )
          .limit(200)
          .fetch(),
      ])

      const collectAll = async (firstPage: typeof inResult): Promise<RawE[]> => {
        let page = firstPage
        const all: RawE[] = [...(page.entities as RawE[])]
        while (page.hasNextPage()) {
          page = await page.next()
          all.push(...(page.entities as RawE[]))
        }
        return all
      }

      const [incoming, outgoing] = await Promise.all([
        collectAll(inResult),
        collectAll(outResult),
      ])

      const decode = (entities: RawE[], mine: boolean): ArkivDM[] =>
        entities.flatMap(e => {
          try {
            const parsed = e.toJson != null
              ? (e.toJson() as { iv: string; ciphertext: string })
              : (JSON.parse(new TextDecoder().decode(e.payload as Uint8Array)) as { iv: string; ciphertext: string })
            const plain = decryptMessage(dmKey, parsed.iv, parsed.ciphertext)
            return [{
              id: String(e.key),
              sender: String(e.attributes['sender']?.value ?? ''),
              timestamp: Number(e.attributes['created_ms']?.value ?? 0),
              text: new TextDecoder().decode(plain),
              mine,
            }]
          } catch { return [] }
        })

      return [
        ...decode(incoming, false),
        ...decode(outgoing, true),
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
    if (!this.walletClient) return

    try {
      const { ExpirationTime } = await import('@arkiv-network/sdk')
      const { str } = await import('@arkiv-network/sdk/attr')

      await this.walletClient.createEntity({
        payload: new Uint8Array(),
        contentType: 'application/octet-stream',
        attributes: {
          project: str('weave-v1'),
          type: str('channel-member'),
          org: str(org),
          channel: str(channel),
          member: str(member),
          role: str(role),
        },
        expires: ExpirationTime.fromDays(365),
      })
    } catch (err) {
      console.warn('[arkiv] addChannelMember failed:', err)
    }
  }

  /** List all members of a channel stored on Arkiv. */
  async listChannelMembers(org: string, channel: string): Promise<ChannelMemberRecord[]> {
    if (!this.publicClient) return []

    try {
      const { eq, and } = await import('@arkiv-network/sdk/query')
      const { str } = await import('@arkiv-network/sdk/attr')

      type AttrEntity = { attributes: Record<string, { value: unknown }> }

      let result = await this.publicClient
        .select({ key: true, attributes: true })
        .where(
          and(
            eq('project', str('weave-v1')),
            eq('type', str('channel-member')),
            eq('org', str(org)),
            eq('channel', str(channel)),
          ),
        )
        .limit(200)
        .fetch()

      const entities: AttrEntity[] = [...(result.entities as AttrEntity[])]
      while (result.hasNextPage()) {
        result = await result.next()
        entities.push(...(result.entities as AttrEntity[]))
      }

      return entities.map(e => ({
        member: String(e.attributes['member']?.value ?? ''),
        role: String(e.attributes['role']?.value ?? 'member'),
      }))
    } catch (err) {
      console.warn('[arkiv] listChannelMembers failed:', err)
      return []
    }
  }
}
