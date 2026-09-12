# app/main/crypto — Cryptographic Primitives

Low-level cryptography used by the main process. All implementations are built on `@noble/*` primitives (noble-curves, noble-hashes) — no TLS, no OpenSSL.

## noise-xx.ts

Full Noise_XX handshake implementation. Noise_XX provides mutual authentication and forward secrecy:
- Handshake pattern: `XX` (both parties transmit ephemeral keys, both are authenticated)
- DH function: X25519
- Cipher: ChaCha20-Poly1305
- Hash: SHA-256
- KDF: HKDF-SHA256

Used for all direct peer-to-peer connections (call signaling, DM transport). After a successful handshake, both sides hold matching transport keys for encrypted bidirectional communication.

## secp256k1-ecdh.ts

ECDH on secp256k1. Used to derive a shared secret from a recipient's stealth spend public key and a locally generated ephemeral private key. This shared secret is the basis for ERC-5564 stealth address derivation and for per-recipient channel key encryption.

## stealth-address.ts

ERC-5564 stealth address computation. Given a recipient's stealth view key and spend key (from their ENS text records), computes a one-time stealth address and the corresponding ephemeral public key. The sender publishes the ephemeral pubkey; only the recipient can recognize and spend the stealth address.

Used to send payments and one-time session invites without linking the sender's or recipient's main wallet.

## channel-crypto.ts

Per-channel symmetric encryption for Arkiv messages.

- **Key generation**: `generateChannelKey()` produces a random 256-bit AES-GCM key.
- **Message encryption**: `encryptMessage(key, plaintext)` → `{ ciphertext, iv }` (AES-256-GCM, random IV per message).
- **Message decryption**: `decryptMessage(key, ciphertext, iv)` → plaintext string.
- **Key wrapping**: `wrapKeyForRecipient(channelKey, recipientNoisePub)` derives a shared secret via X25519 ECDH (sender ephemeral + recipient noise pubkey), then wraps the channel key with AES-KW. The wrapped key blob is stored on Arkiv per recipient.
- **Key unwrapping**: `unwrapKey(wrappedKey, myNoisePriv, senderEphemeralPub)` reverses the above.

Key versions increment on each `rotateChannelKey` call. Messages reference their key version so old messages remain decryptable after rotation.
