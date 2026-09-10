import { getPublicKey, SimplePool } from 'nostr-tools'
import { decode as nip19decode } from 'nostr-tools/nip19'
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
    // wrapEvent and p-tag both require raw hex pubkey; decode npub bech32
    const decoded = nip19decode(recipientNpub)
    if (decoded.type !== 'npub') throw new Error('recipientNpub must be an npub string')
    const recipientHex = decoded.data as string
    const rumor = {
      kind: 14,
      content: message,
      tags: [['p', recipientHex]],
      created_at: Math.floor(Date.now() / 1000),
    }
    const giftWrap = wrapEvent(rumor, senderPriv, recipientHex)
    // publish() returns Promise<string>[] (one per relay) — must await the array
    await Promise.all(this.pool.publish(this.relays, giftWrap)).catch(() => {})
  }

  subscribe(
    recipientPriv: Uint8Array,
    onMessage: (from: string, content: string) => void,
  ): () => void {
    const recipientPub = getPublicKey(recipientPriv)
    const sub = this.pool.subscribeMany(
      this.relays,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { kinds: [1059], '#p': [recipientPub] } as any,
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
