/**
 * Noise_XX_25519_ChaChaPoly_SHA256 — ported from ghostcall.
 * Uses @noble/curves (X25519) and @noble/ciphers (ChaCha20-Poly1305)
 * instead of tweetnacl, so no extra deps are needed.
 */

import * as net from 'net'
import * as nodeCrypto from 'crypto'
import { x25519 } from '@noble/curves/ed25519'
import { chacha20poly1305 } from '@noble/ciphers/chacha'
import { randomBytes } from '@noble/hashes/utils'

const PROTOCOL_NAME = 'Noise_XX_25519_ChaChaPoly_SHA256'
const DHLEN = 32
const MACLEN = 16

// ── primitives ──────────────────────────────────────────────────────────────

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(nodeCrypto.createHash('sha256').update(data).digest())
}

function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  return new Uint8Array(nodeCrypto.createHmac('sha256', Buffer.from(key)).update(Buffer.from(data)).digest())
}

function concat(...bufs: Uint8Array[]): Uint8Array {
  const total = bufs.reduce((n, b) => n + b.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const b of bufs) { out.set(b, off); off += b.length }
  return out
}

function chachaEncrypt(key: Uint8Array, nonce: Uint8Array, ad: Uint8Array, pt: Uint8Array): Uint8Array {
  return chacha20poly1305(key, nonce, ad.length > 0 ? ad : undefined).encrypt(pt)
}

function chachaDecrypt(key: Uint8Array, nonce: Uint8Array, ad: Uint8Array, ct: Uint8Array): Uint8Array {
  return chacha20poly1305(key, nonce, ad.length > 0 ? ad : undefined).decrypt(ct)
}

function hkdf2(ck: Uint8Array, input: Uint8Array): [Uint8Array, Uint8Array] {
  const tempK = hmacSha256(ck, input)
  const out1 = hmacSha256(tempK, new Uint8Array([0x01]))
  const out2 = hmacSha256(tempK, concat(out1, new Uint8Array([0x02])))
  return [out1, out2]
}

function nonceToBytes(n: bigint): Uint8Array {
  const b = new Uint8Array(12)
  let v = n
  for (let i = 4; i < 12; i++) {
    b[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return b
}

// ── CipherState ─────────────────────────────────────────────────────────────

class CipherState {
  private k: Uint8Array | null = null
  private n = 0n

  initKey(key: Uint8Array) {
    this.k = key
    this.n = 0n
  }

  hasKey(): boolean { return this.k !== null }

  encrypt(ad: Uint8Array, pt: Uint8Array): Uint8Array {
    if (!this.k) return pt
    const ct = chachaEncrypt(this.k, nonceToBytes(this.n), ad, pt)
    this.n++
    return ct
  }

  decrypt(ad: Uint8Array, ct: Uint8Array): Uint8Array {
    if (!this.k) return ct
    const pt = chachaDecrypt(this.k, nonceToBytes(this.n), ad, ct)
    this.n++
    return pt
  }
}

// ── SymmetricState ───────────────────────────────────────────────────────────

class SymmetricState {
  private cs = new CipherState()
  private ck: Uint8Array
  private h: Uint8Array

  constructor() {
    const name = new TextEncoder().encode(PROTOCOL_NAME)
    this.h = name.length <= DHLEN
      ? (() => { const h = new Uint8Array(DHLEN); h.set(name); return h })()
      : sha256(name)
    this.ck = new Uint8Array(this.h)
  }

  mixKey(input: Uint8Array) {
    const [ck, k] = hkdf2(this.ck, input)
    this.ck = ck
    this.cs.initKey(k.slice(0, 32))
  }

  mixHash(data: Uint8Array) {
    this.h = sha256(concat(this.h, data))
  }

  encryptAndHash(pt: Uint8Array): Uint8Array {
    const ct = this.cs.encrypt(this.h, pt)
    this.mixHash(ct)
    return ct
  }

  decryptAndHash(ct: Uint8Array): Uint8Array {
    const pt = this.cs.decrypt(this.h, ct)
    this.mixHash(ct)
    return pt
  }

  split(): [CipherState, CipherState] {
    const [k1, k2] = hkdf2(this.ck, new Uint8Array(0))
    const c1 = new CipherState(); c1.initKey(k1.slice(0, 32))
    const c2 = new CipherState(); c2.initKey(k2.slice(0, 32))
    return [c1, c2]
  }
}

// ── SocketReader ─────────────────────────────────────────────────────────────

class SocketReader {
  private buf = Buffer.alloc(0)
  private waiters: Array<{ len: number; resolve: (b: Buffer) => void; reject: (e: Error) => void }> = []

  constructor(socket: net.Socket) {
    socket.on('data', (chunk: Buffer) => {
      this.buf = Buffer.concat([this.buf, chunk])
      this._drain()
    })
    socket.on('error', (err) => this._rejectAll(err))
    socket.on('close', () => this._rejectAll(new Error('Socket closed')))
  }

  private _drain() {
    while (this.waiters.length > 0 && this.buf.length >= this.waiters[0].len) {
      const { len, resolve } = this.waiters.shift()!
      resolve(this.buf.slice(0, len))
      this.buf = this.buf.slice(len)
    }
  }

  private _rejectAll(err: Error) {
    const pending = this.waiters.splice(0)
    for (const { reject } of pending) reject(err)
  }

  readExact(len: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.waiters.push({ len, resolve, reject })
      this._drain()
    })
  }

  async readFrame(): Promise<Buffer> {
    const header = await this.readExact(2)
    const frameLen = header.readUInt16BE(0)
    return this.readExact(frameLen)
  }
}

// ── frame I/O ────────────────────────────────────────────────────────────────

function writeFrame(socket: net.Socket, data: Uint8Array) {
  const frame = Buffer.allocUnsafe(2 + data.length)
  frame.writeUInt16BE(data.length, 0)
  Buffer.from(data).copy(frame, 2)
  socket.write(frame)
}

// ── Transport ─────────────────────────────────────────────────────────────────

export interface NoiseTransport {
  send(frame: Buffer): void
  recv: AsyncIterable<Buffer>
}

function makeTransport(
  socket: net.Socket,
  reader: SocketReader,
  sendCs: CipherState,
  recvCs: CipherState,
): NoiseTransport {
  async function* recvFrames(): AsyncIterable<Buffer> {
    while (true) {
      let frame: Buffer
      try { frame = await reader.readFrame() } catch { break }
      try {
        const pt = recvCs.decrypt(new Uint8Array(0), new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength))
        yield Buffer.from(pt)
      } catch { break }
    }
  }
  return {
    send(frame: Buffer) {
      const ct = sendCs.encrypt(new Uint8Array(0), new Uint8Array(frame.buffer, frame.byteOffset, frame.byteLength))
      writeFrame(socket, ct)
    },
    recv: recvFrames(),
  }
}

// ── Noise_XX handshake ────────────────────────────────────────────────────────

async function performHandshake(
  socket: net.Socket,
  localStaticPriv: Uint8Array,
  isInitiator: boolean,
): Promise<NoiseTransport> {
  const ss = new SymmetricState()
  const reader = new SocketReader(socket)

  const staticPriv = localStaticPriv.slice(0, 32)
  const staticPub = x25519.getPublicKey(staticPriv)

  const ephPriv = randomBytes(32)
  const ephPub = x25519.getPublicKey(ephPriv)

  ss.mixHash(new Uint8Array(0))

  if (isInitiator) {
    // -> e
    ss.mixHash(ephPub)
    writeFrame(socket, ephPub)

    // <- e, ee, s, es
    const msg1 = await reader.readFrame()
    const remoteEph = new Uint8Array(msg1.buffer, msg1.byteOffset, DHLEN)
    ss.mixHash(remoteEph)
    ss.mixKey(x25519.getSharedSecret(ephPriv, remoteEph))
    const remoteStaticEnc = new Uint8Array(msg1.buffer, msg1.byteOffset + DHLEN, DHLEN + MACLEN)
    const remoteStatic = ss.decryptAndHash(remoteStaticEnc)
    ss.mixKey(x25519.getSharedSecret(ephPriv, remoteStatic))

    // -> s, se
    const myStaticEnc = ss.encryptAndHash(staticPub)
    ss.mixKey(x25519.getSharedSecret(staticPriv, remoteEph))
    writeFrame(socket, myStaticEnc)

    const [send, recv] = ss.split()
    return makeTransport(socket, reader, send, recv)
  } else {
    // <- e
    const msg0 = await reader.readFrame()
    const remoteEph = new Uint8Array(msg0.buffer, msg0.byteOffset, DHLEN)
    ss.mixHash(remoteEph)

    // -> e, ee, s, es
    ss.mixHash(ephPub)
    ss.mixKey(x25519.getSharedSecret(ephPriv, remoteEph))
    const myStaticEnc = ss.encryptAndHash(staticPub)
    ss.mixKey(x25519.getSharedSecret(staticPriv, remoteEph))
    writeFrame(socket, concat(ephPub, myStaticEnc))

    // <- s, se
    const msg2 = await reader.readFrame()
    const remoteStaticEnc = new Uint8Array(msg2.buffer, msg2.byteOffset, DHLEN + MACLEN)
    const remoteStatic = ss.decryptAndHash(remoteStaticEnc)
    ss.mixKey(x25519.getSharedSecret(ephPriv, remoteStatic))

    const [recv, send] = ss.split()
    return makeTransport(socket, reader, send, recv)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export class NoiseSession {
  static handshakeInitiator(socket: net.Socket, localStaticPriv: Uint8Array): Promise<NoiseTransport> {
    return performHandshake(socket, localStaticPriv, true)
  }

  static handshakeResponder(socket: net.Socket, localStaticPriv: Uint8Array): Promise<NoiseTransport> {
    return performHandshake(socket, localStaticPriv, false)
  }
}

export function noiseKeygen(): { secretKey: Uint8Array; publicKey: Uint8Array } {
  const secretKey = randomBytes(32)
  return { secretKey, publicKey: x25519.getPublicKey(secretKey) }
}
