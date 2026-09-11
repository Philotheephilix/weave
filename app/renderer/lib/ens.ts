/**
 * ENS / WeaveWildcardResolver helpers for the renderer.
 * Uses viem public client — no Node.js deps, runs in browser context.
 */
import { createPublicClient, http, decodeAbiParameters, parseAbiParameters } from 'viem'
import { sepolia } from 'viem/chains'
import { ADDRESSES, SEPOLIA_RPC } from './addresses'

const client = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC) })

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

function encodeDnsName(label: string): Uint8Array {
  const parts = [label.replace(/\.weave\.eth$/i, ''), 'weave', 'eth']
  const bufs = parts.map(p => {
    const b = new TextEncoder().encode(p)
    return Uint8Array.from([b.length, ...b])
  })
  const total = bufs.reduce((s, b) => s + b.length, 0) + 1
  const out = new Uint8Array(total)
  let off = 0
  for (const b of bufs) { out.set(b, off); off += b.length }
  out[off] = 0
  return out
}

function encodeTextCalldata(key: string): `0x${string}` {
  const keyBytes = new TextEncoder().encode(key)
  const selector = '59d1d43c'
  const node = '0'.repeat(64)
  const offset = '0000000000000000000000000000000000000000000000000000000000000040'
  const keyLen = keyBytes.length.toString(16).padStart(64, '0')
  const hexParts = Array.from(keyBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const keyHex = hexParts.padEnd(Math.ceil(keyBytes.length / 32) * 64, '0')
  return `0x${selector}${node}${offset}${keyLen}${keyHex}` as `0x${string}`
}

function bufferFromHex(s: string): Uint8Array {
  const clean = s.startsWith('0x') ? s.slice(2) : s
  const bytes = new Uint8Array(Math.floor(clean.length / 2))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export interface EnsIdentity {
  viewPub: Uint8Array
  spendPub: Uint8Array
  noisePub: Uint8Array
  onionAddress: string
  nostrPub: string
}

export async function resolveWeaveHandle(label: string): Promise<EnsIdentity | null> {
  const bare = label.replace(/\.weave\.eth$/i, '').toLowerCase()
  if (!bare || bare.includes('.') || bare.length > 63) return null

  const dnsName = encodeDnsName(bare)
  const dnsHex: `0x${string}` = `0x${Array.from(dnsName).map(b => b.toString(16).padStart(2, '0')).join('')}`

  const textKeys = [
    'crypto.stealth.view',
    'crypto.stealth.spend',
    'crypto.x25519',
    'network.onion.v3',
    'social.nostr.pubkey',
  ]

  const results: Record<string, string> = {}
  await Promise.all(
    textKeys.map(async key => {
      try {
        const data = encodeTextCalldata(key)
        const raw = await client.readContract({
          address: ADDRESSES.WeaveWildcardResolver,
          abi: WILDCARD_RESOLVER_ABI,
          functionName: 'resolve',
          args: [dnsHex, data],
        }) as `0x${string}`
        const [decoded] = decodeAbiParameters(parseAbiParameters('string'), raw)
        results[key] = decoded as string
      } catch {
        // key not set
      }
    })
  )

  if (!results['network.onion.v3']) return null

  return {
    viewPub:      bufferFromHex(results['crypto.stealth.view']  ?? ''),
    spendPub:     bufferFromHex(results['crypto.stealth.spend'] ?? ''),
    noisePub:     bufferFromHex(results['crypto.x25519']        ?? ''),
    onionAddress: results['network.onion.v3'],
    nostrPub:     results['social.nostr.pubkey'] ?? '',
  }
}
