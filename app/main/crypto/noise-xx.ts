/**
 * Noise_XX_25519_ChaChaPoly_SHA256
 * Frame format: uint16-BE(ciphertext_len) || ciphertext+tag(16 bytes)
 *
 * Role ordering:
 *   Initiator: writeHandshake() → readHandshake() → writeHandshake()
 *   Responder: readHandshake() → writeHandshake() → readHandshake()
 */
import { x25519 } from '@noble/curves/ed25519'
import { chacha20poly1305 } from '@noble/ciphers/chacha'
import { sha256 } from '@noble/hashes/sha256'
import { hkdf } from '@noble/hashes/hkdf'
import { randomBytes } from '@noble/hashes/utils'

const PROTOCOL_NAME = new TextEncoder().encode('Noise_XX_25519_ChaChaPoly_SHA256')
const EMPTY = new Uint8Array(0)

function mixKey(ck: Uint8Array, inputKey: Uint8Array): [Uint8Array, Uint8Array] {
  const out = hkdf(sha256, inputKey, ck, EMPTY, 64)
  return [out.slice(0, 32), out.slice(32)]
}

function mixHash(h: Uint8Array, data: Uint8Array): Uint8Array {
  const buf = new Uint8Array(h.length + data.length)
  buf.set(h); buf.set(data, h.length)
  return sha256(buf)
}

function aead(k: Uint8Array, n: number, ad: Uint8Array, pt: Uint8Array): Uint8Array {
  const nonce = new Uint8Array(12)
  new DataView(nonce.buffer).setUint32(8, n, false)
  return chacha20poly1305(k, nonce, ad).encrypt(pt)
}

function aeadDecrypt(k: Uint8Array, n: number, ad: Uint8Array, ct: Uint8Array): Uint8Array {
  const nonce = new Uint8Array(12)
  new DataView(nonce.buffer).setUint32(8, n, false)
  return chacha20poly1305(k, nonce, ad).decrypt(ct)
}

export class NoiseXXSession {
  private role: 'initiator' | 'responder'
  readonly staticPriv: Uint8Array
  readonly staticPub: Uint8Array
  private ephPriv: Uint8Array = EMPTY
  private ephPub: Uint8Array = EMPTY
  private remoteEphPub: Uint8Array = EMPTY
  remoteStaticPub: Uint8Array = EMPTY

  private ck: Uint8Array
  private h: Uint8Array
  private k: Uint8Array = EMPTY
  private n = 0
  private step = 0

  private sendKey: Uint8Array = EMPTY
  private recvKey: Uint8Array = EMPTY
  private sendN = 0
  private recvN = 0
  private done = false

  constructor(role: 'initiator' | 'responder', staticPriv?: Uint8Array) {
    this.role = role
    this.staticPriv = staticPriv ?? randomBytes(32)
    this.staticPub = x25519.getPublicKey(this.staticPriv)
    this.h = sha256(PROTOCOL_NAME)
    this.ck = this.h
  }

  get handshakeComplete(): boolean { return this.done }

  // ── Handshake writers ──────────────────────────────────────────────────────

  writeHandshake(): Uint8Array {
    if (this.role === 'initiator' && this.step === 0) return this._writeMsg1()
    if (this.role === 'responder' && this.step === 1) return this._writeMsg2()
    if (this.role === 'initiator' && this.step === 2) return this._writeMsg3()
    throw new Error(`writeHandshake: wrong step ${this.step} for ${this.role}`)
  }

  readHandshake(msg: Uint8Array): void {
    if (this.role === 'responder' && this.step === 0) return this._readMsg1(msg)
    if (this.role === 'initiator' && this.step === 1) return this._readMsg2(msg)
    if (this.role === 'responder' && this.step === 2) return this._readMsg3(msg)
    throw new Error(`readHandshake: wrong step ${this.step} for ${this.role}`)
  }

  // → e
  private _writeMsg1(): Uint8Array {
    this.ephPriv = randomBytes(32)
    this.ephPub = x25519.getPublicKey(this.ephPriv)
    this.h = mixHash(this.h, this.ephPub)
    this.step = 1
    return this.ephPub
  }

  private _readMsg1(msg: Uint8Array): void {
    this.remoteEphPub = msg.slice(0, 32)
    this.h = mixHash(this.h, this.remoteEphPub)
    this.step = 1
  }

  // ← e, ee, s, es
  private _writeMsg2(): Uint8Array {
    this.ephPriv = randomBytes(32)
    this.ephPub = x25519.getPublicKey(this.ephPriv)
    this.h = mixHash(this.h, this.ephPub);
    [this.ck, this.k] = mixKey(this.ck, x25519.getSharedSecret(this.ephPriv, this.remoteEphPub))
    this.n = 0
    const encS = aead(this.k, this.n++, this.h, this.staticPub)
    this.h = mixHash(this.h, encS);
    [this.ck, this.k] = mixKey(this.ck, x25519.getSharedSecret(this.staticPriv, this.remoteEphPub))
    this.n = 0
    const encPayload = aead(this.k, this.n++, this.h, EMPTY)
    this.h = mixHash(this.h, encPayload)
    this.step = 2
    return concat(this.ephPub, encS, encPayload)
  }

  private _readMsg2(msg: Uint8Array): void {
    let off = 0
    this.remoteEphPub = msg.slice(off, off + 32); off += 32
    this.h = mixHash(this.h, this.remoteEphPub);
    [this.ck, this.k] = mixKey(this.ck, x25519.getSharedSecret(this.ephPriv, this.remoteEphPub))
    this.n = 0
    const encS = msg.slice(off, off + 48); off += 48 // 32 + 16 tag
    this.remoteStaticPub = aeadDecrypt(this.k, this.n++, this.h, encS)
    this.h = mixHash(this.h, encS);
    [this.ck, this.k] = mixKey(this.ck, x25519.getSharedSecret(this.ephPriv, this.remoteStaticPub))
    this.n = 0
    const encPayload = msg.slice(off); off = msg.length
    aeadDecrypt(this.k, this.n++, this.h, encPayload)
    this.h = mixHash(this.h, encPayload)
    this.step = 2
  }

  // → s, se
  private _writeMsg3(): Uint8Array {
    const encS = aead(this.k, this.n++, this.h, this.staticPub)
    this.h = mixHash(this.h, encS);
    [this.ck, this.k] = mixKey(this.ck, x25519.getSharedSecret(this.staticPriv, this.remoteEphPub))
    this.n = 0
    const encPayload = aead(this.k, this.n++, this.h, EMPTY)
    this.h = mixHash(this.h, encPayload)
    this._split()
    this.step = 3
    return concat(encS, encPayload)
  }

  private _readMsg3(msg: Uint8Array): void {
    let off = 0
    const encS = msg.slice(off, off + 48); off += 48
    this.remoteStaticPub = aeadDecrypt(this.k, this.n++, this.h, encS)
    this.h = mixHash(this.h, encS);
    [this.ck, this.k] = mixKey(this.ck, x25519.getSharedSecret(this.ephPriv, this.remoteStaticPub))
    this.n = 0
    const encPayload = msg.slice(off)
    aeadDecrypt(this.k, this.n++, this.h, encPayload)
    this.h = mixHash(this.h, encPayload)
    this._split()
    this.step = 3
  }

  private _split(): void {
    const out = hkdf(sha256, EMPTY, this.ck, EMPTY, 64)
    this.sendKey = this.role === 'initiator' ? out.slice(0, 32) : out.slice(32)
    this.recvKey = this.role === 'initiator' ? out.slice(32) : out.slice(0, 32)
    this.sendN = 0
    this.recvN = 0
    this.done = true
  }

  // ── Transport ──────────────────────────────────────────────────────────────

  encrypt(plaintext: Uint8Array): Uint8Array {
    if (!this.done) throw new Error('handshake not complete')
    const nonce = new Uint8Array(12)
    new DataView(nonce.buffer).setUint32(8, this.sendN++, false)
    const ct = chacha20poly1305(this.sendKey, nonce).encrypt(plaintext)
    const frame = new Uint8Array(2 + ct.length)
    new DataView(frame.buffer).setUint16(0, ct.length, false)
    frame.set(ct, 2)
    return frame
  }

  decrypt(frame: Uint8Array): Uint8Array {
    if (!this.done) throw new Error('handshake not complete')
    if (frame.length < 2) throw new Error('frame too short')
    const len = new DataView(frame.buffer, frame.byteOffset).getUint16(0, false)
    if (frame.length < 2 + len || len < 16) throw new Error(`invalid frame length ${len}`)
    const ct = frame.slice(2, 2 + len)
    const nonce = new Uint8Array(12)
    new DataView(nonce.buffer).setUint32(8, this.recvN++, false)
    return chacha20poly1305(this.recvKey, nonce).decrypt(ct)
  }
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const a of arrays) { out.set(a, off); off += a.length }
  return out
}
