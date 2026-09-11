// DHT values are encrypted to the recipient's viewPub; TTL ~10 min (DHT natural expiry).
// Uses mutable DHT put (BEP-44): ed25519 keypair is derived from viewPriv so the
// lookup key (ed25519 pubkey) is stable and derivable from the view key alone.
import DHT from 'bittorrent-dht'
import { sha256 } from '@noble/hashes/sha256'
import { secp256k1 } from '@noble/curves/secp256k1'
import { ed25519 } from '@noble/curves/ed25519'
import { chacha20poly1305 } from '@noble/ciphers/chacha'
import { randomBytes } from '@noble/hashes/utils'
import { ecdhSecp256k1 } from './crypto/secp256k1-ecdh.js'

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

  // Derive a stable ed25519 keypair from the secp256k1 view private key.
  // This makes the DHT lookup key (ed25519 pubkey) deterministic from viewPriv.
  private _ed25519FromView(viewPriv: Uint8Array): { priv: Uint8Array; pub: Uint8Array } {
    // Hash the secp256k1 viewPriv to get a 32-byte ed25519 seed
    const seed = sha256(viewPriv)
    const pub = ed25519.getPublicKey(seed)
    return { priv: seed, pub }
  }

  private _encrypt(viewPub: Uint8Array, payload: DHTValue): Uint8Array {
    const ephPriv = randomBytes(32)
    const nonce = randomBytes(12)
    const key = ecdhSecp256k1(ephPriv, viewPub).slice(0, 32)
    const ct = chacha20poly1305(key, nonce).encrypt(new TextEncoder().encode(JSON.stringify(payload)))
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
      if (blob.length < 61) return null // 33 ephPub + 12 nonce + 16 min tag
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

  announce(viewPriv: Uint8Array, viewPub: Uint8Array, onionAddress: string): void {
    const { priv: edPriv, pub: edPub } = this._ed25519FromView(viewPriv)
    const value = this._encrypt(viewPub, { onion: onionAddress, ts: Date.now() })
    // Mutable DHT put: k=ed25519 pubkey, sign function provides BEP-44 signature
    this.dht.put({
      k: Buffer.from(edPub),
      v: Buffer.from(value),
      sign: (buf: Buffer) => Buffer.from(ed25519.sign(buf, edPriv)),
    }, () => {})
  }

  lookup(
    viewPriv: Uint8Array,
    onResult: (onionAddress: string) => void,
  ): void {
    const { pub: edPub } = this._ed25519FromView(viewPriv)
    this.dht.get(Buffer.from(edPub), (err: Error | null, res: { v: Buffer } | null) => {
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
