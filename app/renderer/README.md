# app/renderer — React Renderer Process

The sandboxed UI layer. Runs in Chromium with `nodeIntegration: false`. All communication with the main process goes through `window.weave.*` (the contextBridge surface). No direct Node.js or Ethereum access.

## Component Tree

```
Layout
├── NavRail              — left icon rail (teams, calls, activity, settings)
├── Sidebar              — channel list + member list for the active team
├── ChannelView          — message thread for the active channel
│   └── MessageComposer  — text input + send (hidden for non-admins in announcement channels)
├── DMView               — direct message thread
├── OrgAdminPanel        — admin tab: enroll members, manage roles, sub-admins
├── CallOverlay          — floating call UI (active call controls)
└── Modals
    ├── InviteModal      — invite a member to a channel
    └── MembersModal     — view org members
```

Entry: `app/page.tsx` — the root React component. All app state lives here (no Redux, no Zustand). State includes: active team, active channel, messages per channel, channel key versions, identity, org membership.

## How `window.weave.*` Is Used

The renderer never imports from `app/main`. Instead it calls typed wrappers from `lib/ipc.ts`:

```typescript
import { ipcGrantAdmin, ipcListOrgRoles } from '@/lib/ipc'

const result = await ipcGrantAdmin(orgName, memberName, memberAddress)
if (result.error) { /* show error */ }
```

The wrappers call `window.weave.ens.grantAdmin(...)` which invokes `ipcRenderer.invoke('ens:grantAdmin', args)` over the contextBridge.

## State Management

All state is plain React (`useState`, `useEffect`). The root `page.tsx` holds:
- `teams` / `channels` — loaded from `window.weave.teams.load()`
- `msgs` — `Record<channelKey, Message[]>` where `channelKey = "${team}::${channel}"`
- `channelKeyVersions` — `Record<channelKey, number>` — current key version per channel; never falls back to 0 (missing = bail on send)
- `identity` — loaded from `window.weave.identity.load()`

Arkiv messages arrive via `arkiv-poller.ts` which dispatches `ARKIV_MESSAGES_RECEIVED` actions. The reducer merges incoming messages into `msgs`, deduplicating by message ID.

## lib/

See `lib/README.md` for detailed descriptions of each library file.
