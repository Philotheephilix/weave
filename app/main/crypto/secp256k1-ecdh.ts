import { secp256k1 } from '@noble/curves/secp256k1'

export function ecdhSecp256k1(privKey: Uint8Array, pubKey: Uint8Array): Uint8Array {
  // Returns the 32-byte x-coordinate of the shared point.
  // secp256k1.getSharedSecret validates both keys and handles edge cases.
  const shared = secp256k1.getSharedSecret(privKey, pubKey, true) // compressed, 33 bytes
  return shared.slice(1) // x-coordinate only
}
