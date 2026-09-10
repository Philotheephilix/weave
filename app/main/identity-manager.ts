import { createPublicClient, http, decodeAbiParameters, parseAbiParameters } from 'viem'
import { sepolia } from 'viem/chains'
import { secp256k1 } from '@noble/curves/secp256k1'
import { x25519 } from '@noble/curves/ed25519'
import { randomBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { ADDRESSES, SEPOLIA_RPC } from './addresses'

export interface WeaveIdentity {
  viewPriv: Uint8Array
  viewPub: Uint8Array
  spendPriv: Uint8Array
  spendPub: Uint8Array
  noisePriv: Uint8Array   // x25519 for Noise_XX
  noisePub: Uint8Array
}

export interface ResolvedIdentity {
  viewPub: Uint8Array
  spendPub: Uint8Array
  noisePub: Uint8Array
  onionAddress: string
  nostrPub: string
}

const NOTIFICATION_LOG_ABI = [
  {
    name: 'getMatches',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'userPubkeyHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'string[]' }],
  },
] as const

const WILDCARD_RESOLVER_ABI = [
  {
    name: 'resolve',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'dnsName', type: 'bytes' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bytes' }],
  },
] as const

function _encodeDnsName(label: string): Uint8Array {
  if (!label || label.includes('.') || label.length > 63) throw new Error(`invalid label: ${label}`)
  // label.weave.eth → \x{len}label\x05weave\x03eth\x00
  const parts = [label, 'weave', 'eth']
  const bufs = parts.map(p => {
    const b = new TextEncoder().encode(p)
    return Uint8Array.from([b.length, ...b])
  })
  const total = bufs.reduce((s, b) => s + b.length, 0) + 1
  const out = new Uint8Array(total)
  let off = 0
  for (const b of bufs) { out.set(b, off); off += b.length }
  out[off] = 0 // explicit null terminator
  return out
}

function _encodeTextCalldata(key: string): `0x${string}` {
  // selector(text(bytes32,string)) = 0x59d1d43c, but resolver uses ENSIP-10:
  // resolve(bytes,bytes) where inner bytes is text(node, key)
  // We pass ABI-encoded (bytes32 node, string key) as the data param
  // node = namehash('alice.weave.eth') — resolver ignores it and uses dnsName
  const keyBytes = new TextEncoder().encode(key)
  const selector = '59d1d43c'
  // ABI encode: (bytes32, string) — 32 bytes zero node + string
  const node = '0'.repeat(64)
  const offset = '0000000000000000000000000000000000000000000000000000000000000040'
  const keyLen = keyBytes.length.toString(16).padStart(64, '0')
  const keyHex = Buffer.from(keyBytes).toString('hex').padEnd(Math.ceil(keyBytes.length / 32) * 64, '0')
  return `0x${selector}${node}${offset}${keyLen}${keyHex}` as `0x${string}`
}

export function createIdentity(): WeaveIdentity {
  const viewPriv  = secp256k1.utils.randomPrivateKey()
  const spendPriv = secp256k1.utils.randomPrivateKey()
  const noisePriv = randomBytes(32)
  return {
    viewPriv,
    viewPub:   secp256k1.getPublicKey(viewPriv, true),
    spendPriv,
    spendPub:  secp256k1.getPublicKey(spendPriv, true),
    noisePriv,
    noisePub:  x25519.getPublicKey(noisePriv),
  }
}

export class IdentityManager {
  private client = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) })

  async resolveHandle(label: string): Promise<ResolvedIdentity | null> {
    if (!ADDRESSES.WeaveWildcardResolver) return null
    const dnsName = _encodeDnsName(label)

    const textKeys = ['crypto.stealth.view', 'crypto.stealth.spend', 'crypto.x25519', 'network.onion.v3', 'social.nostr.pubkey']
    const results: Record<string, string> = {}

    for (const key of textKeys) {
      try {
        const data = _encodeTextCalldata(key)
        const raw = await this.client.readContract({
          address: ADDRESSES.WeaveWildcardResolver,
          abi: WILDCARD_RESOLVER_ABI,
          functionName: 'resolve',
          args: [`0x${Buffer.from(dnsName).toString('hex')}` as `0x${string}`, data],
        }) as `0x${string}`
        const [decoded] = decodeAbiParameters(parseAbiParameters('string'), raw)
        results[key] = decoded as string
      } catch { /* key not set */ }
    }

    if (!results['network.onion.v3']) return null
    const strip = (s: string) => s.startsWith('0x') ? s.slice(2) : s
    return {
      viewPub:      Buffer.from(strip(results['crypto.stealth.view']  ?? ''), 'hex'),
      spendPub:     Buffer.from(strip(results['crypto.stealth.spend'] ?? ''), 'hex'),
      noisePub:     Buffer.from(strip(results['crypto.x25519']        ?? ''), 'hex'),
      onionAddress: results['network.onion.v3'],
      nostrPub:     results['social.nostr.pubkey'] ?? '',
    }
  }

  async pollNotificationLog(spendPub: Uint8Array): Promise<string[]> {
    if (!ADDRESSES.NotificationLog) return []
    try {
      return await this.client.readContract({
        address: ADDRESSES.NotificationLog,
        abi: NOTIFICATION_LOG_ABI,
        functionName: 'getMatches',
        args: [`0x${Buffer.from(sha256(spendPub)).toString('hex')}` as `0x${string}`],
      }) as string[]
    } catch {
      return []
    }
  }
}
