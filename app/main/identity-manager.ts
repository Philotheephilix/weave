import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { secp256k1 } from '@noble/curves/secp256k1'
import { x25519 } from '@noble/curves/ed25519'
import { randomBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { keccak_256 } from '@noble/hashes/sha3'
import { ADDRESSES, SEPOLIA_RPC } from './addresses.js'

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
  {
    name: 'identities',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [
      { name: 'stealthViewKey',  type: 'bytes' },
      { name: 'stealthSpendKey', type: 'bytes' },
      { name: 'x25519Pubkey',   type: 'bytes' },
      { name: 'onionAddress',   type: 'bytes' },
      { name: 'nostrPubkey',    type: 'bytes' },
      { name: 'registeredAt',   type: 'uint64' },
    ],
  },
] as const


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
    // Strip .weave.eth suffix if present, use the rest as the mapping key
    const normalized = label.replace(/\.weave\.eth$/, '')
    const labelHash = `0x${Buffer.from(keccak_256(new TextEncoder().encode(normalized))).toString('hex')}` as `0x${string}`

    try {
      const id = await this.client.readContract({
        address: ADDRESSES.WeaveWildcardResolver,
        abi: WILDCARD_RESOLVER_ABI,
        functionName: 'identities',
        args: [labelHash],
      }) as readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, bigint]

      // id = [stealthViewKey, stealthSpendKey, x25519Pubkey, onionAddress, nostrPubkey, registeredAt]
      if (!id[0] || id[0] === '0x') return null
      const strip = (s: `0x${string}`) => s.startsWith('0x') ? s.slice(2) : s
      const onionBytes = id[3] && id[3].length > 2 ? Buffer.from(strip(id[3]), 'hex').toString('utf8') : ''
      return {
        viewPub:      Buffer.from(strip(id[0]), 'hex'),
        spendPub:     Buffer.from(strip(id[1]), 'hex'),
        noisePub:     Buffer.from(strip(id[2]), 'hex'),
        onionAddress: onionBytes,
        nostrPub:     strip(id[4]),
      }
    } catch {
      return null
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
