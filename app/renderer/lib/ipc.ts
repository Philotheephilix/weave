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

// Augment window with the weave bridge
declare global {
  interface Window {
    weave: {
      identity: {
        get: () => Promise<WeaveIdentityInfo>
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
