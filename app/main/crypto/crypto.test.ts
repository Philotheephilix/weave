import { ecdhSecp256k1 } from './secp256k1-ecdh'
import { computeStealthAddress, checkStealthAddress } from './stealth-address'
import { NoiseXXSession } from './noise-xx'
import { secp256k1 } from '@noble/curves/secp256k1'
import { randomBytes } from '@noble/hashes/utils'

// ── secp256k1 ECDH ────────────────────────────────────────────────────────────

test('ECDH is commutative: ECDH(a, bG) == ECDH(b, aG)', () => {
  const a = secp256k1.utils.randomPrivateKey()
  const b = secp256k1.utils.randomPrivateKey()
  const aG = secp256k1.getPublicKey(a, true)
  const bG = secp256k1.getPublicKey(b, true)

  const sharedAB = ecdhSecp256k1(a, bG)
  const sharedBA = ecdhSecp256k1(b, aG)

  expect(Buffer.from(sharedAB).toString('hex'))
    .toBe(Buffer.from(sharedBA).toString('hex'))
})

test('ECDH output is 32 bytes', () => {
  const a = secp256k1.utils.randomPrivateKey()
  const bG = secp256k1.getPublicKey(secp256k1.utils.randomPrivateKey(), true)
  expect(ecdhSecp256k1(a, bG).length).toBe(32)
})

// ── ERC-5564 stealth addressing ───────────────────────────────────────────────

test('ERC-5564: sender computes stealth, recipient detects it', () => {
  const viewPriv  = secp256k1.utils.randomPrivateKey()
  const spendPriv = secp256k1.utils.randomPrivateKey()
  const viewPub   = secp256k1.getPublicKey(viewPriv, true)
  const spendPub  = secp256k1.getPublicKey(spendPriv, true)
  const r         = secp256k1.utils.randomPrivateKey()

  const { stealthAddress, ephemeralPub } = computeStealthAddress({ viewPub, spendPub }, r)

  expect(stealthAddress).toMatch(/^0x[0-9a-f]{40}$/)
  expect(checkStealthAddress(viewPriv, spendPub, ephemeralPub, stealthAddress)).toBe(true)
})

test('ERC-5564: wrong view key does not match', () => {
  const viewPriv  = secp256k1.utils.randomPrivateKey()
  const wrongPriv = secp256k1.utils.randomPrivateKey()
  const spendPriv = secp256k1.utils.randomPrivateKey()
  const viewPub   = secp256k1.getPublicKey(viewPriv, true)
  const spendPub  = secp256k1.getPublicKey(spendPriv, true)
  const r         = secp256k1.utils.randomPrivateKey()

  const { stealthAddress, ephemeralPub } = computeStealthAddress({ viewPub, spendPub }, r)

  expect(checkStealthAddress(wrongPriv, spendPub, ephemeralPub, stealthAddress)).toBe(false)
})

// ── Noise_XX ──────────────────────────────────────────────────────────────────

test('Noise_XX: 3-message handshake completes, encrypt/decrypt roundtrip', () => {
  const ini = new NoiseXXSession('initiator')
  const res = new NoiseXXSession('responder')

  // → e
  const msg1 = ini.writeHandshake()
  res.readHandshake(msg1)

  // ← e, ee, s, es
  const msg2 = res.writeHandshake()
  ini.readHandshake(msg2)

  // → s, se
  const msg3 = ini.writeHandshake()
  res.readHandshake(msg3)

  expect(ini.handshakeComplete).toBe(true)
  expect(res.handshakeComplete).toBe(true)

  const plaintext = new TextEncoder().encode('hello weave')
  const ciphertext = ini.encrypt(plaintext)
  const decrypted  = res.decrypt(ciphertext)
  expect(new TextDecoder().decode(decrypted)).toBe('hello weave')
})

test('Noise_XX: bidirectional after handshake', () => {
  const ini = new NoiseXXSession('initiator')
  const res = new NoiseXXSession('responder')
  res.readHandshake(ini.writeHandshake())
  ini.readHandshake(res.writeHandshake())
  res.readHandshake(ini.writeHandshake())

  const msg = new TextEncoder().encode('from responder')
  expect(new TextDecoder().decode(ini.decrypt(res.encrypt(msg)))).toBe('from responder')
})

test('Noise_XX: static keys are authenticated (responder sees initiator pubkey)', () => {
  const iniPriv = secp256k1.utils.randomPrivateKey().slice(0, 32) // 32-byte x25519 key
  const ini = new NoiseXXSession('initiator', randomBytes(32))
  const res = new NoiseXXSession('responder')

  res.readHandshake(ini.writeHandshake())
  ini.readHandshake(res.writeHandshake())
  res.readHandshake(ini.writeHandshake())

  expect(res.remoteStaticPub).toEqual(ini.staticPub)
  expect(ini.remoteStaticPub).toEqual(res.staticPub)
})

test('Noise_XX: tampered ciphertext throws', () => {
  const ini = new NoiseXXSession('initiator')
  const res = new NoiseXXSession('responder')
  res.readHandshake(ini.writeHandshake())
  ini.readHandshake(res.writeHandshake())
  res.readHandshake(ini.writeHandshake())

  const frame = ini.encrypt(new TextEncoder().encode('secret'))
  frame[4] ^= 0xff // flip a byte in the ciphertext
  expect(() => res.decrypt(frame)).toThrow()
})
