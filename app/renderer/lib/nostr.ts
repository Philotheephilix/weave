/**
 * Nostr NIP-59 gift-wrap messaging helpers.
 * Uses nostr-tools in the renderer — no IPC needed for sending.
 */
import {
  generateSecretKey,
  getPublicKey,
  finalizeEvent,
  nip04,
} from 'nostr-tools'
import type { UnsignedEvent } from 'nostr-tools'

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
]

export interface StoredMessage {
  id: string
  direction: 'sent' | 'received'
  content: string
  timestamp: number
  transport: 'tor' | 'nostr'
}

export interface Conversation {
  noisePub: string   // hex — unique key for this contact
  handle: string     // e.g. "alice.weave.eth"
  nostrPub: string   // hex — their nostr pubkey
  messages: StoredMessage[]
}

// ──────────────────────────────────────────────────────────────────
// Storage helpers (localStorage)
// ──────────────────────────────────────────────────────────────────

const STORE_KEY = 'weave:conversations'

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Conversation[]) : []
  } catch {
    return []
  }
}

export function saveConversations(convos: Conversation[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(convos))
  } catch {
    // quota exceeded — silent
  }
}

export function upsertConversation(convos: Conversation[], updated: Conversation): Conversation[] {
  const idx = convos.findIndex(c => c.noisePub === updated.noisePub)
  if (idx >= 0) {
    const next = [...convos]
    next[idx] = updated
    return next
  }
  return [...convos, updated]
}

// ──────────────────────────────────────────────────────────────────
// Send a NIP-04 encrypted DM (simplified gift-wrap)
// Returns transport used
// ──────────────────────────────────────────────────────────────────

export async function sendNostrMessage(
  senderPrivKeyHex: string,
  recipientPubKeyHex: string,
  content: string,
): Promise<'nostr' | 'error'> {
  try {
    const sk = hexToUint8(senderPrivKeyHex)
    const encrypted = await nip04.encrypt(sk, recipientPubKeyHex, content)

    const template: UnsignedEvent = {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', recipientPubKeyHex]],
      content: encrypted,
      pubkey: getPublicKey(sk),
    }
    const event = finalizeEvent(template, sk)

    // Try each relay; first success wins
    for (const url of RELAYS) {
      try {
        await sendToRelay(url, event)
        return 'nostr'
      } catch {
        // try next
      }
    }
    return 'error'
  } catch {
    return 'error'
  }
}

function sendToRelay(url: string, event: ReturnType<typeof finalizeEvent>): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    const timer = setTimeout(() => { ws.close(); reject(new Error('timeout')) }, 5000)
    ws.onopen = () => {
      ws.send(JSON.stringify(['EVENT', event]))
    }
    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as unknown[]
        if (Array.isArray(msg) && msg[0] === 'OK' && msg[2] === true) {
          clearTimeout(timer)
          ws.close()
          resolve()
        }
      } catch { /* continue */ }
    }
    ws.onerror = () => { clearTimeout(timer); reject(new Error('ws error')) }
  })
}

function hexToUint8(hex: string): Uint8Array {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  return new Uint8Array(h.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
}

// Ephemeral key for this session (per-session identity for Nostr)
let _ephKey: string | null = null
export function getOrCreateEphNostrKey(): string {
  if (_ephKey) return _ephKey
  const stored = localStorage.getItem('weave:nostr:ephkey')
  if (stored) { _ephKey = stored; return _ephKey }
  const sk = generateSecretKey()
  _ephKey = Array.from(sk).map(b => b.toString(16).padStart(2, '0')).join('')
  localStorage.setItem('weave:nostr:ephkey', _ephKey)
  return _ephKey
}
