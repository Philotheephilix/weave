/**
 * ERC-5564 stealth addressing on secp256k1.
 * stealth_addr = P_spend + sha256(ECDH(r, P_view)) * G
 *
 * NOTE: uses sha256 as stand-in for keccak256 — consistent with the CRE
 * Go scanner so both sides agree on which address to compare.
 * Replace both with keccak256 before mainnet.
 */
import { secp256k1 } from '@noble/curves/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { ecdhSecp256k1 } from './secp256k1-ecdh'

export interface MetaAddress {
  viewPub: Uint8Array  // 33-byte compressed secp256k1
  spendPub: Uint8Array // 33-byte compressed secp256k1
}

export interface StealthResult {
  stealthAddress: string  // 0x-prefixed Ethereum address
  ephemeralPub: Uint8Array
}

export function computeStealthAddress(meta: MetaAddress, ephemeralPriv: Uint8Array): StealthResult {
  const ephemeralPub = secp256k1.getPublicKey(ephemeralPriv, true)
  const hScalar = BigInt('0x' + Buffer.from(sha256(ecdhSecp256k1(ephemeralPriv, meta.viewPub))).toString('hex'))
  const stealthPoint = secp256k1.ProjectivePoint.fromHex(meta.spendPub)
    .add(secp256k1.ProjectivePoint.BASE.multiply(hScalar))
  return { stealthAddress: _pointToAddress(stealthPoint), ephemeralPub }
}

export function checkStealthAddress(
  viewPriv: Uint8Array,
  spendPub: Uint8Array,
  ephemeralPub: Uint8Array,
  stealthAddress: string,
): boolean {
  const hScalar = BigInt('0x' + Buffer.from(sha256(ecdhSecp256k1(viewPriv, ephemeralPub))).toString('hex'))
  const candidate = secp256k1.ProjectivePoint.fromHex(spendPub)
    .add(secp256k1.ProjectivePoint.BASE.multiply(hScalar))
  return _pointToAddress(candidate).toLowerCase() === stealthAddress.toLowerCase()
}

function _pointToAddress(point: ReturnType<typeof secp256k1.ProjectivePoint.fromHex>): string {
  // Ethereum address = sha256(uncompressed_xy)[12:]  (sha256 stand-in for keccak256)
  const uncompressed = point.toRawBytes(false) // 65 bytes: 0x04 || X || Y
  const hash = sha256(uncompressed.slice(1))   // hash of 64-byte XY
  return '0x' + Buffer.from(hash.slice(12)).toString('hex')
}
