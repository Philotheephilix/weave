/**
 * Typed wrappers for all preload APIs exposed by window.weave.
 * No mocks — every call goes through contextBridge to ipcMain.
 */

export interface RoleDef {
  slug: string
  displayName: string
  description: string
  color: string
  bitmap: string
  nybble: number
  active: boolean
}

export interface StoredChannel {
  id: string
  name: string
  kind: string
  desc?: string
  unread: number
}

export interface StoredTeam {
  id: string
  name: string
  initials: string
  tint: string
  ink: string
  members: number
  channels: StoredChannel[]
}

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
        enroll: (args: { orgName: string; memberName: string; memberAddress: string; memberSeedPhrase?: string[] }) => Promise<OrgEnrollResult>
        listMembers: (orgName: string) => Promise<OrgMember[]>
        mintGuestToken: (args: { orgLabel: string; guestLabel: string; guestAddress: string; expiryLabel: string }) => Promise<{ txHash?: string; error?: string }>
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
      peer: {
        reachable: (args: { peerLabel: string }) => Promise<{ reachable: boolean; onionAddress?: string }>
      }
      chat: {
        sendDM(args: {
          org: string; peerLabel: string; text: string
        }): Promise<{ ok: boolean; via: 'tor' | 'nostr' | 'arkiv-only' }>
      }
      call: {
        goOnline(): Promise<void>
        initiate(args: { onionAddr: string }): Promise<void>
        hangUp(): Promise<void>
        getState(): Promise<unknown>
        signal(args: { recipientLabel: string; signal: object }): Promise<void>
        onSignal(cb: (payload: { from: string; signal: object }) => void): () => void
        onAudioFrame(cb: (data: ArrayBuffer) => void): () => void
        sendAudioFrame(data: ArrayBuffer): void
        onConnected(cb: (info: { direction: string; onionAddr?: string }) => void): () => void
        onError(cb: (err: { message: string }) => void): () => void
      }
      teams: {
        load(orgName: string): Promise<StoredTeam[]>
        save(args: { orgName: string; teams: StoredTeam[] }): Promise<void>
        createTeam(args: { orgName: string; team: StoredTeam }): Promise<void>
        createChannel(args: { orgName: string; teamId: string; channel: StoredChannel }): Promise<void>
      }
      dm: {
        list(orgName: string): Promise<string[]>
        open(args: { orgName: string; peerLabel: string }): Promise<void>
      }
      ens: {
        getMemberRole(args: { orgName: string; memberAddress: string }): Promise<{ bitmap: string; isAdmin: boolean; error?: string }>
        grantAdmin(args: { orgName: string; memberName: string; memberAddress: string }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
        revokeAccess(args: { orgName: string; memberName: string; memberAddress: string }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
        getTxt(args: { labelHash: string; key: string }): Promise<{ value?: string; error?: string }>
        setTxt(args: { labelHash: string; key: string; value: string }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
        defineRole(args: { orgName: string; nybble: number; slug: string; displayName: string; description: string; color: string }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
        listOrgRoles(args: { orgName: string }): Promise<{ roles?: RoleDef[]; error?: string }>
        grantNamedRole(args: { orgName: string; memberName: string; memberAddress: string; slug: string }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
        revokeNamedRole(args: { orgName: string; memberName: string; memberAddress: string; slug: string }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
        setCapabilities(args: { orgName: string; memberName: string; channels: string; canInvite: boolean; canExport: boolean }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
        getCapabilities(args: { orgName: string; memberName: string }): Promise<{ channels?: string; canInvite?: boolean; canExport?: boolean; error?: string }>
        setContentHash(args: { orgName: string; memberName: string; hash: string }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
        setCoinAddr(args: { orgName: string; memberName: string; coinType: number; addr: string }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
        addSubAdmin(args: { orgName: string; account: string }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
        removeSubAdmin(args: { orgName: string; account: string }): Promise<{ ok?: boolean; txHash?: string; error?: string }>
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
        }): Promise<{ ok: true; version: number } | { ok: false; reason: string }>
        postMessage(args: {
          org: string; channel: string; keyVersion: number; text: string; expiryDays?: number
        }): Promise<{ ok: boolean; id?: string; reason?: string }>
        fetchMessages(args: {
          org: string; channel: string; sinceTimestamp: number; keyVersion: number
        }): Promise<{ id: string; sender: string; timestamp: number; text: string }[]>
        postDM(args: {
          org: string; recipientLabel: string; text: string; expiryDays?: number
        }): Promise<{ ok: boolean; id?: string; reason?: string }>
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

export async function ipcPeerReachable(peerLabel: string): Promise<{ reachable: boolean; onionAddress?: string }> {
  return window.weave.peer.reachable({ peerLabel })
}

export async function ipcCallSignal(args: { recipientLabel: string; signal: object }): Promise<void> {
  return window.weave.call.signal(args)
}

export function ipcCallOnSignal(
  cb: (payload: { from: string; signal: object }) => void
): () => void {
  return window.weave.call.onSignal(cb)
}

// ── EAC / TXT helpers ─────────────────────────────────────────────────────────

export async function ipcGetMemberRole(
  orgName: string,
  memberAddress: string
): Promise<{ bitmap: string; isAdmin: boolean; error?: string }> {
  return window.weave.ens.getMemberRole({ orgName, memberAddress })
}

export async function ipcGrantAdmin(
  orgName: string,
  memberName: string,
  memberAddress: string
): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.grantAdmin({ orgName, memberName, memberAddress })
}

export async function ipcRevokeAccess(
  orgName: string,
  memberName: string,
  memberAddress: string
): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.revokeAccess({ orgName, memberName, memberAddress })
}

export async function ipcGetTxt(
  labelHash: string,
  key: string
): Promise<string | null> {
  const res = await window.weave.ens.getTxt({ labelHash, key })
  return res.error ? null : (res.value ?? null)
}

export async function ipcSetTxt(
  labelHash: string,
  key: string,
  value: string
): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.setTxt({ labelHash, key, value })
}

// ── Phase 1–3: Custom roles, capabilities, sub-admins ────────────────────────

export async function ipcDefineRole(args: {
  orgName: string; nybble: number; slug: string
  displayName: string; description: string; color: string
}): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.defineRole(args)
}

export async function ipcListOrgRoles(orgName: string): Promise<{ roles?: RoleDef[]; error?: string }> {
  return window.weave.ens.listOrgRoles({ orgName })
}

export async function ipcGrantNamedRole(args: {
  orgName: string; memberName: string; memberAddress: string; slug: string
}): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.grantNamedRole(args)
}

export async function ipcRevokeNamedRole(args: {
  orgName: string; memberName: string; memberAddress: string; slug: string
}): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.revokeNamedRole(args)
}

export async function ipcSetCapabilities(args: {
  orgName: string; memberName: string; channels: string; canInvite: boolean; canExport: boolean
}): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.setCapabilities(args)
}

export async function ipcGetCapabilities(orgName: string, memberName: string): Promise<{
  channels?: string; canInvite?: boolean; canExport?: boolean; error?: string
}> {
  return window.weave.ens.getCapabilities({ orgName, memberName })
}

export async function ipcSetContentHash(args: {
  orgName: string; memberName: string; hash: string
}): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.setContentHash(args)
}

export async function ipcSetCoinAddr(args: {
  orgName: string; memberName: string; coinType: number; addr: string
}): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.setCoinAddr(args)
}

export async function ipcAddSubAdmin(orgName: string, account: string): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.addSubAdmin({ orgName, account })
}

export async function ipcRemoveSubAdmin(orgName: string, account: string): Promise<{ ok?: boolean; txHash?: string; error?: string }> {
  return window.weave.ens.removeSubAdmin({ orgName, account })
}
