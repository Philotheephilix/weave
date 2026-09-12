# app — Weave Electron App

The Weave desktop application. Built with Electron + React (renderer) + TypeScript throughout. The main process handles all privileged operations (crypto, ENS writes, Tor, Arkiv); the renderer is a sandboxed React UI that communicates exclusively through the contextBridge.

## Running

```bash
npm install
npm run dev          # starts Electron with hot-reload renderer
npm run build        # production build
```

## Process Split

```
Electron main process (app/main/)
├── index.ts                  — app entry; creates BrowserWindow
├── ipc-handlers.ts           — all ipcMain.handle() registrations
├── preload.ts                — contextBridge: exposes window.weave.*
├── identity-manager.ts       — seed phrase load/save (OS keychain)
├── arkiv-manager.ts          — Arkiv wallet client (message store)
├── tor-manager.ts            — Tor daemon lifecycle
├── dht-discovery.ts          — BitTorrent DHT peer announce/lookup
├── onion-*.ts                — Tor onion server/client/probe
├── noise-session.ts          — Noise_XX session state
├── nostr-delivery.ts         — Nostr NIP-59 offline message delivery
├── call-orchestrator.ts      — WebRTC call state machine
├── audio-bridge.ts           — audio frame routing
└── crypto/                   — cryptographic primitives

Renderer process (app/renderer/)
├── app/page.tsx              — root React state and event loop
├── components/               — all UI components
└── lib/                      — typed IPC wrappers, ENS helpers, pollers
```

## Identity / Seed Phrase Flow

1. On first launch, the user generates a BIP-39 seed phrase (12 words) in onboarding.
2. The seed is saved encrypted via `identity-manager.ts` (OS keychain on macOS).
3. On subsequent launches, `loadIdentity()` retrieves the saved seed.
4. Any IPC handler that needs to sign a transaction calls `deriveKeysFromSeed(seedPhrase)` to recover `ethPrivKey`, then builds a viem `walletClient` inline.
5. The private key never crosses the contextBridge; only the results of transactions do.

## Arkiv Messaging (end-to-end)

1. **Key setup**: When a channel is created or a member is added, `rotateChannelKey` generates a fresh symmetric key, encrypts it for each member's Noise pubkey via ECDH, and stores it on Arkiv via `storeChannelKey`.
2. **Sending**: `postMessage` encrypts the plaintext with the current channel key (AES-GCM), then calls the `weave:arkiv:postMessage` IPC channel. The main process Arkiv wallet client writes the ciphertext to Arkiv.
3. **Receiving**: `arkiv-poller.ts` runs a 30-second interval poll per channel. It fetches messages since `sinceTimestamp` (the max timestamp of the last received batch), decrypts each with the appropriate key version, and dispatches them into React state.
4. **Key rotation**: When a member is added or removed, `rotateChannelKey` is called (after ACL updates complete), producing a new key version. Old messages remain readable under their original key version.

## Key Entry Points

| File | Role |
|------|------|
| `main/index.ts` | Creates the BrowserWindow, registers global shortcuts, starts Tor and DHT |
| `main/ipc-handlers.ts` | Every `ipcMain.handle()` call — the full API surface between processes |
| `main/preload.ts` | `contextBridge.exposeInMainWorld('weave', {...})` — what the renderer can see |
| `renderer/app/page.tsx` | Root React component; owns all app state (teams, channels, messages, key versions) |
| `renderer/components/admin/OrgAdminPanel.tsx` | Admin operations: enroll members, manage roles, define custom roles |
