// app/main/crypto/channel-crypto.ts
// AES-256-GCM encrypt/decrypt + x25519 ECDH key wrapping + DM key derivation.
// Uses Node.js built-in crypto for AES-GCM (synchronous, no additional dep).
// Uses @noble/curves/ed25519 for x25519 and @noble/hashes/hkdf for HKDF.

import { x25519 } from '@noble/curves/ed25519'
import { randomBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { hkdf } from '@noble/hashes/hkdf'
import { createCipheriv, createDecipheriv } from 'crypto'

const WRAP_SALT = new TextEncoder().encode('weave-channel-key-wrap-v1')
const DM_SALT   = new TextEncoder().encode('weave-dm-key-v1')

// ── Public interfaces ──────────────────────────────────────────────────────────

export interface WrappedKey {
  ephPub:     string  // hex-encoded 32-byte x25519 ephemeral public key
  iv:         string  // hex-encoded 12-byte AES-GCM nonce
  ciphertext: string  // hex-encoded 48 bytes (32-byte key + 16-byte GCM tag)
}

export interface EncryptedMessage {
  iv:         string  // hex-encoded 12-byte AES-GCM nonce (random per message)
  ciphertext: string  // hex-encoded AES-256-GCM ciphertext + 16-byte tag
}

// ── Key derivation ─────────────────────────────────────────────────────────────

/** Generate a random 32-byte channel symmetric key. */
export function deriveChannelKey(): Uint8Array {
  return randomBytes(32)
}

/**
 * Derive a symmetric DM key from two Noise x25519 keys.
 * Commutative: deriveDmKey(alicePriv, bobPub) === deriveDmKey(bobPriv, alicePub).
 */
export function deriveDmKey(myPriv: Uint8Array, peerPub: Uint8Array): Uint8Array {
  const shared = x25519.getSharedSecret(myPriv, peerPub)
  return hkdf(sha256, shared, DM_SALT, undefined, 32)
}

// ── Channel key wrapping ───────────────────────────────────────────────────────

/**
 * Wrap K_channel for a member using x25519 ECDH + HKDF + AES-256-GCM.
 * A fresh ephemeral key pair is generated for each wrapping operation.
 * adminNoisePriv is accepted for API symmetry but NOT used directly —
 * a fresh ephemeral is always generated.
 */
export function wrapChannelKey(
  _adminNoisePriv: Uint8Array,
  memberNoisePub: Uint8Array,
  K_channel: Uint8Array,
): WrappedKey {
  const ephPriv  = randomBytes(32)
  const ephPub   = x25519.getPublicKey(ephPriv)
  const shared   = x25519.getSharedSecret(ephPriv, memberNoisePub)
  const wrapKey  = hkdf(sha256, shared, WRAP_SALT, undefined, 32)
  const { iv, ciphertext } = _aesGcmEncrypt(wrapKey, K_channel)
  return {
    ephPub:     Buffer.from(ephPub).toString('hex'),
    iv:         Buffer.from(iv).toString('hex'),
    ciphertext: Buffer.from(ciphertext).toString('hex'),
  }
}

/**
 * Unwrap a WrappedKey using the member's Noise private key.
 * Returns the raw K_channel bytes.
 */
export function unwrapChannelKey(
  memberNoisePriv: Uint8Array,
  wrapped: WrappedKey,
): Uint8Array {
  const ephPub  = Buffer.from(wrapped.ephPub, 'hex')
  const iv      = Buffer.from(wrapped.iv, 'hex')
  const ct      = Buffer.from(wrapped.ciphertext, 'hex')
  const shared  = x25519.getSharedSecret(memberNoisePriv, new Uint8Array(ephPub))
  const wrapKey = hkdf(sha256, shared, WRAP_SALT, undefined, 32)
  return _aesGcmDecrypt(wrapKey, iv, ct)
}

// ── Message encrypt/decrypt ────────────────────────────────────────────────────

/** Encrypt plaintext bytes with K_channel. Returns hex-encoded iv + ciphertext. */
export function encryptMessage(K_channel: Uint8Array, plaintext: Uint8Array): EncryptedMessage {
  const iv = randomBytes(12)
  const { ciphertext } = _aesGcmEncryptRaw(K_channel, iv, plaintext)
  return {
    iv:         Buffer.from(iv).toString('hex'),
    ciphertext: Buffer.from(ciphertext).toString('hex'),
  }
}

/** Decrypt a message encrypted with encryptMessage. Returns plaintext bytes. */
export function decryptMessage(
  K_channel: Uint8Array,
  iv: string,
  ciphertext: string,
): Uint8Array {
  return _aesGcmDecrypt(
    K_channel,
    Buffer.from(iv, 'hex'),
    Buffer.from(ciphertext, 'hex'),
  )
}

// ── Internal AES-256-GCM helpers (synchronous, Node.js built-in crypto) ────────

function _aesGcmEncrypt(
  key: Uint8Array,
  data: Uint8Array,
): { iv: Uint8Array; ciphertext: Uint8Array } {
  const iv = randomBytes(12)
  const { ciphertext } = _aesGcmEncryptRaw(key, iv, data)
  return { iv, ciphertext }
}

function _aesGcmEncryptRaw(
  key: Uint8Array,
  iv: Uint8Array,
  data: Uint8Array,
): { ciphertext: Uint8Array } {
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct     = Buffer.concat([cipher.update(data), cipher.final()])
  const tag    = cipher.getAuthTag()
  return { ciphertext: Buffer.concat([ct, tag]) }
}

function _aesGcmDecrypt(
  key: Uint8Array,
  iv: Uint8Array | Buffer,
  ciphertext: Uint8Array | Buffer,
): Uint8Array {
  const ctBuf  = Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext)
  const ivBuf  = Buffer.isBuffer(iv) ? iv : Buffer.from(iv)
  const tag    = ctBuf.subarray(ctBuf.length - 16)
  const ct     = ctBuf.subarray(0, ctBuf.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', key, ivBuf)
  decipher.setAuthTag(tag)
  return new Uint8Array(Buffer.concat([decipher.update(ct), decipher.final()]))
}
