/**
 * Typed wrappers for all preload APIs exposed by window.weave.
 * No mocks — every call goes through contextBridge to ipcMain.
 */

export interface WeaveIdentityInfo {
  viewPub: string   // hex
  spendPub: string  // hex
  noisePub: string  // hex
}

export interface ResolvedIdentity {
  viewPub: Uint8Array
  spendPub: Uint8Array
  noisePub: Uint8Array
  onionAddress: string
  nostrPub: string
}

export interface TorProxy {
  host: string
  port: number
}

export interface StealthResult {
  stealthAddress: string
  ephemeralPub: Uint8Array
}

export interface OrgCreateResult {
  ensName: string
  adminEns: string
  error?: string
}

export interface OrgEnrollResult {
  ensName: string
  error?: string
}

export interface OrgMember {
  name: string
  address: string
}

export interface LoginResult {
  success: boolean
  identity?: object
  error?: string
}

// Augment window with the weave bridge
declare global {
  interface Window {
    weave: {
      identity: {
        get: () => Promise<WeaveIdentityInfo>
        generateSeed: () => Promise<{ seedPhrase: string[] }>
        deriveAddress: (seedPhrase: string[]) => Promise<{ ethAddress: string; error?: string }>
        save: (data: any) => Promise<{ success: boolean }>
        load: () => Promise<{ handle: string } | null>
        login: (args: { handle: string; seedPhrase: string[] }) => Promise<LoginResult>
      }
      org: {
        create: (args: { orgName: string; seedPhrase: string[] }) => Promise<OrgCreateResult>
        enroll: (args: { orgName: string; memberName: string; memberAddress: string }) => Promise<OrgEnrollResult>
        listMembers: (orgName: string) => Promise<OrgMember[]>
      }
      resolve: (label: string) => Promise<ResolvedIdentity | null>
      notifications: {
        poll: () => Promise<string[]>
      }
      dht: {
        announce: (onion: string) => Promise<void>
        lookup: () => Promise<string | null>
      }
      tor: {
        proxy: () => Promise<TorProxy>
      }
      stealth: {
        compute: (viewPubHex: string, spendPubHex: string) => Promise<StealthResult>
      }
      chat: {
        sendDM(args: {
          org: string; peerLabel: string; text: string
        }): Promise<{ ok: boolean; via: 'tor' | 'nostr' | 'arkiv-only' }>
      }
      on(channel: string, cb: (...args: unknown[]) => void): void
      off(channel: string, cb: (...args: unknown[]) => void): void
      arkiv: {
        storeChannelKey(args: {
          org: string; channel: string; recipient: string
          keyVersion: number; K_channel: string; recipientNoisePub: string
        }): Promise<{ ok: boolean; reason?: string }>
        fetchChannelKey(args: {
          org: string; channel: string; recipientLabel: string; keyVersion: number
        }): Promise<string | null>
        getLatestKeyVersion(args: {
          org: string; channel: string; recipientLabel: string
        }): Promise<number>
        rotateChannelKey(args: {
          org: string; channel: string; members: { label: string; noisePub: string }[]
        }): Promise<number>
        postMessage(args: {
          org: string; channel: string; keyVersion: number; text: string; expiryDays?: number
        }): Promise<string>
        fetchMessages(args: {
          org: string; channel: string; sinceTimestamp: number; keyVersion: number
        }): Promise<{ id: string; sender: string; timestamp: number; text: string }[]>
        postDM(args: {
          org: string; recipientLabel: string; text: string; expiryDays?: number
        }): Promise<string>
        fetchDMs(args: {
          org: string; peerLabel: string; sinceTimestamp: number
        }): Promise<{ id: string; sender: string; timestamp: number; text: string; mine: boolean }[]>
        addChannelMember(args: {
          org: string; channel: string; member: string; role: 'admin' | 'member'
        }): Promise<{ ok: boolean }>
        listChannelMembers(args: {
          org: string; channel: string
        }): Promise<{ member: string; role: string }[]>
      }
    }
  }
}

export async function ipcGetIdentity(): Promise<WeaveIdentityInfo> {
  return window.weave.identity.get()
}

export async function ipcResolve(label: string): Promise<ResolvedIdentity | null> {
  // Normalise: strip ".weave.eth" suffix if the user typed the full name
  const bare = label.replace(/\.weave\.eth$/i, '')
  return window.weave.resolve(bare)
}

export async function ipcPollNotifications(): Promise<string[]> {
  return window.weave.notifications.poll()
}

export async function ipcDhtAnnounce(onion: string): Promise<void> {
  return window.weave.dht.announce(onion)
}

export async function ipcDhtLookup(): Promise<string | null> {
  return window.weave.dht.lookup()
}

export async function ipcTorProxy(): Promise<TorProxy> {
  return window.weave.tor.proxy()
}

export async function ipcComputeStealth(viewPubHex: string, spendPubHex: string): Promise<StealthResult> {
  return window.weave.stealth.compute(viewPubHex, spendPubHex)
}
