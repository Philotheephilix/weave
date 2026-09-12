# app/renderer/lib — Renderer Library Files

## ipc.ts

The typed bridge between the renderer and the main process. Two responsibilities:

1. **Window type augmentation** — declares `interface Window { weave: { ... } }` with precise TypeScript types for every method on `window.weave.*`. This is the source of truth for what the contextBridge exposes. Key types: `RoleDef`, `OrgMember`, `StoredChannel`, `StoredTeam`, `WeaveIdentityInfo`, `ResolvedIdentity`.

2. **Typed wrapper functions** — `ipcGrantAdmin`, `ipcListOrgRoles`, `ipcDefineRole`, `ipcAddSubAdmin`, etc. Components import these instead of calling `window.weave.*` directly, getting compile-time type checking on arguments and return values.

Return type conventions:
- ENS writes: `Promise<{ ok?: boolean; txHash?: string; error?: string }>`
- `rotateChannelKey`: `Promise<{ ok: true; version: number } | { ok: false; reason: string }>`
- `postMessage` / `postDM`: `Promise<{ ok: boolean; id?: string; reason?: string }>`
- `listOrgRoles`: `Promise<{ roles?: RoleDef[]; error?: string }>` — bitmap is a `string` (bigint serialized before crossing the contextBridge)

## ens.ts

Read-only ENS helpers using a viem `PublicClient` pointed at Sepolia. Does not require a private key. Functions:
- `getMemberRole(orgName, memberAddress)` — reads the EAC bitmap for a member
- `listOrgRoles(orgName)` — reads all custom role definitions from `WeaveRoleRegistry`
- `resolveName(name)` — resolves a `*.weave.eth` name to its text record bundle

These are used for display purposes (e.g. showing role badges). Write operations go through IPC handlers, not directly from the renderer.

## addresses.ts

Renderer-side copy of deployed contract addresses and chain config. Kept in sync with `app/main/addresses.ts`. Exports `ADDRESSES`, `SEPOLIA_RPC`, `CHAIN_ID`, `BLOCK_EXPLORER`. The renderer cannot import from `app/main/`, so this duplication is intentional.

## arkiv-poller.ts

Interval-based Arkiv message poller. Started once per active org session. For each channel in the org:
1. Fetches the latest channel key version for the current user.
2. Reads `sinceTimestamp` from `localStorage` (key: `arkiv_last_${org}_${channel}`).
3. Fetches messages from Arkiv since that timestamp across all key versions (0 to current).
4. Dispatches `ARKIV_MESSAGES_RECEIVED` with the new messages.
5. Updates `sinceTimestamp` to `max(message.timestamp)` across the received batch.

Poll interval: 30 seconds. First poll is a full backfill (sinceTimestamp = 0); subsequent polls are incremental.

## ens-display.ts

Utility functions for displaying ENS names in the UI:
- Strips the `.weave.eth` suffix for compact display
- Extracts the member segment from a qualified `member.org.weave.eth` name
- Formats an org name for display in headers and breadcrumbs

## tokens.ts

Design token constants (colors, spacing) used by components that don't use Tailwind. Also exports the EAC role constants (`ROLE_REGISTRAR`, `ROLE_MODERATOR`, etc.) as named bigint values for bitmap manipulation in the renderer.

## types.ts

Shared TypeScript types for the renderer: `Message`, `Channel`, `Team`, `OrgMember`, and related interfaces. Kept separate from `ipc.ts` types (which are bridge-facing) and component prop types (which are component-local).

## nostr.ts

Nostr NIP-59 gift-wrap helpers for the renderer. Used when sending a DM to an offline peer — wraps the message for Nostr delivery and unwraps incoming gift-wrapped events.

## useTorCall.ts

React hook that manages a Tor-based voice/video call session. Wraps `window.weave.call.*` IPC methods and tracks call state (idle, ringing, connected, ended). Used by `CallView` and `CallsPageView`.

## useWebRTC.ts

React hook for WebRTC peer connection management. Used in conjunction with `useTorCall.ts` — the signaling path goes through Tor/Nostr while the media path uses WebRTC once a direct channel is established.
