/**
 * DHT-based peer discovery over bittorrent-dht.
 * Key = sha256(stealthViewPubKey); value = JSON { onion, ts } encrypted with viewPub.
 * TTL ~10 min (DHT naturally expires values).
 */
import DHT from 'bittorrent-dht'
import { sha256 } from '@noble/hashes/sha256'
import { secp256k1 } from '@noble/curves/secp256k1'
import { chacha20poly1305 } from '@noble/ciphers/chacha'
import { randomBytes } from '@noble/hashes/utils'
import { ecdhSecp256k1 } from './crypto/secp256k1-ecdh'

const DHT_TTL_MS = 10 * 60 * 1000

interface DHTValue {
  onion: string
  ts: number
}

export class DHTDiscovery {
  private dht: InstanceType<typeof DHT>

  constructor() {
    this.dht = new DHT({ verify: null })
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.dht.listen(0, resolve)
    })
  }

  stop(): void {
    this.dht.destroy()
  }

  private _makeKey(viewPub: Uint8Array): Buffer {
    return Buffer.from(sha256(viewPub))
  }

  private _encrypt(viewPub: Uint8Array, payload: DHTValue): Uint8Array {
    const ephPriv = randomBytes(32) as Uint8Array
    const sharedX = ecdhSecp256k1(ephPriv, viewPub)
    const key = sharedX.slice(0, 32)
    const nonce = randomBytes(12) as Uint8Array
    const pt = new TextEncoder().encode(JSON.stringify(payload))
    const ct = chacha20poly1305(key, nonce).encrypt(pt)
    const ephPub = secp256k1.getPublicKey(ephPriv, true)
    // layout: 33-byte ephPub || 12-byte nonce || ciphertext
    const out = new Uint8Array(33 + 12 + ct.length)
    out.set(ephPub, 0)
    out.set(nonce, 33)
    out.set(ct, 45)
    return out
  }

  private _decrypt(viewPriv: Uint8Array, blob: Uint8Array): DHTValue | null {
    try {
      if (blob.length < 46) return null
      const ephPub = blob.slice(0, 33)
      const nonce = blob.slice(33, 45)
      const ct = blob.slice(45)
      const sharedX = ecdhSecp256k1(viewPriv, ephPub)
      const key = sharedX.slice(0, 32)
      const pt = chacha20poly1305(key, nonce).decrypt(ct)
      return JSON.parse(new TextDecoder().decode(pt)) as DHTValue
    } catch {
      return null
    }
  }

  announce(viewPub: Uint8Array, onionAddress: string): void {
    const key = this._makeKey(viewPub)
    const value = this._encrypt(viewPub, { onion: onionAddress, ts: Date.now() })
    this.dht.put({ k: key, v: Buffer.from(value) }, () => {})
  }

  lookup(
    viewPub: Uint8Array,
    viewPriv: Uint8Array,
    onResult: (onionAddress: string) => void,
  ): void {
    const key = this._makeKey(viewPub)
    this.dht.get(key, (err: Error | null, res: { v: Buffer } | null) => {
      if (err || !res) return
      const val = this._decrypt(viewPriv, res.v)
      if (!val) return
      const age = Date.now() - val.ts
      if (age > DHT_TTL_MS) return
      if (/^[a-z2-7]{56}\.onion$/.test(val.onion)) {
        onResult(val.onion)
      }
    })
  }
}
