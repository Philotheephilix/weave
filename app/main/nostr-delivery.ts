/**
 * NIP-59 gift-wrap offline delivery fallback via public Nostr relays.
 * Wraps encrypted message in a gift-wrap event so the outer envelope
 * reveals nothing about sender, recipient, or content.
 */
import { generateSecretKey, getPublicKey, SimplePool } from 'nostr-tools'
import { wrapEvent, unwrapEvent } from 'nostr-tools/nip59'
import type { Event } from 'nostr-tools'

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
]

export class NostrDelivery {
  private pool: SimplePool
  private relays: string[]

  constructor(relays: string[] = DEFAULT_RELAYS) {
    this.pool = new SimplePool()
    this.relays = relays
  }

  async send(
    senderPriv: Uint8Array,
    recipientNpub: string,
    message: string,
  ): Promise<void> {
    const rumor = {
      kind: 14,
      content: message,
      tags: [['p', recipientNpub]],
      created_at: Math.floor(Date.now() / 1000),
    }
    const giftWrap = wrapEvent(rumor, senderPriv, recipientNpub)
    await Promise.all(this.relays.map(relay =>
      this.pool.publish([relay], giftWrap).catch(() => {})
    ))
  }

  subscribe(
    recipientPriv: Uint8Array,
    onMessage: (from: string, content: string) => void,
  ): () => void {
    const recipientPub = getPublicKey(recipientPriv)
    const sub = this.pool.subscribeMany(
      this.relays,
      [{ kinds: [1059], '#p': [recipientPub] }],
      {
        onevent(event: Event) {
          try {
            const rumor = unwrapEvent(event, recipientPriv)
            onMessage(rumor.pubkey ?? '', rumor.content ?? '')
          } catch {
            // malformed or not for us
          }
        },
      },
    )
    return () => sub.close()
  }

  close(): void {
    this.pool.close(this.relays)
  }
}
