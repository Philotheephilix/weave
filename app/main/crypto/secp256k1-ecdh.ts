import { secp256k1 } from '@noble/curves/secp256k1'

export function ecdhSecp256k1(privKey: Uint8Array, compressedPub: Uint8Array): Uint8Array {
  const shared = secp256k1.ProjectivePoint.fromHex(compressedPub)
    .multiply(BigInt('0x' + Buffer.from(privKey).toString('hex')))
  return Buffer.from(shared.x.toString(16).padStart(64, '0'), 'hex')
}
