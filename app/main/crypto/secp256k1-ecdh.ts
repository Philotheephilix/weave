import { secp256k1 } from '@noble/curves/secp256k1'

/**
 * ECDH on secp256k1: returns x-coordinate of scalar * compressedPub as 32 bytes.
 */
export function ecdhSecp256k1(
  privKey: Uint8Array,
  compressedPub: Uint8Array,
): Uint8Array {
  const point = secp256k1.ProjectivePoint.fromHex(compressedPub)
  const scalar = BigInt('0x' + Buffer.from(privKey).toString('hex'))
  const shared = point.multiply(scalar)
  const hex = shared.x.toString(16).padStart(64, '0')
  return Uint8Array.from(Buffer.from(hex, 'hex'))
}
