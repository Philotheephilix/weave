# app/main — Electron Main Process

All privileged Node.js code lives here. The renderer cannot import these modules directly — everything goes through the contextBridge defined in `preload.ts`.

## Files

### index.ts
App entry point. Creates the `BrowserWindow` with `nodeIntegration: false` and `contextIsolation: true`. Starts the Tor daemon, DHT discovery, and registers IPC handlers. Loads `preload.ts` into the renderer sandbox.

### ipc-handlers.ts
The complete API surface between main and renderer. Every `ipcMain.handle(channel, handler)` registration lives here. Handlers follow this pattern:

```typescript
ipcMain.handle('ens:someAction', async (_event, args) => {
  const saved = await loadIdentity()
  const { ethPrivKey } = deriveKeysFromSeed(saved.seedPhrase as string[])
  const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC),
    account: privateKeyToAccount(ethPrivKey),
  })
  // ... call contract
  return { ok: true, txHash }
})
```

IPC channels are namespaced: `ens:*`, `org:*`, `arkiv:*` (prefixed `weave:arkiv:*`), `identity:*`, `dht:*`, `tor:*`, `peer:*`, `call:*`, `teams:*`, `dm:*`.

**Bigint rule**: viem returns `bigint` values from `readContract`. These cannot cross the contextBridge (structured-clone throws). Always `.toString()` any bigint before returning.

### preload.ts
Runs in the renderer sandbox with Node.js access. Calls `contextBridge.exposeInMainWorld('weave', {...})` to expose the typed `window.weave` API. Each method is a thin wrapper: `(args) => ipcRenderer.invoke(channel, args)`. See `app/renderer/lib/ipc.ts` for the corresponding type declarations.

### arkiv-manager.ts
Main-process Arkiv wallet client. Holds the Arkiv `WalletClient` and `PublicClient`. Implements:
- `postMessage` / `postDM` — encrypt and write to Arkiv
- `fetchMessages` / `fetchDMs` — query Arkiv and decrypt
- `storeChannelKey` — encrypt a channel key for a recipient and store on Arkiv
- `fetchChannelKey` / `getLatestKeyVersion` — retrieve channel key material
- `rotateChannelKey` — generate new key, re-encrypt for all current members, store new version
- `addChannelMember` / `listChannelMembers` — manage Arkiv channel ACL

### identity-manager.ts
Manages the user's seed phrase. On macOS uses the OS keychain via the `keytar` native module. Exposes `loadIdentity()` (returns `{ handle, seedPhrase }`) and `saveIdentity()`. Used by every IPC handler that needs to sign a transaction.

### addresses.ts
Main-process copy of deployed contract addresses and chain config. Kept in sync with `app/renderer/lib/addresses.ts`. Update both files after any contract redeployment.

### crypto/
Cryptographic primitives. See `crypto/README.md`.

### tor-manager.ts
Lifecycle management for the embedded Tor daemon. Starts Tor, waits for the SOCKS proxy to be ready, provides the proxy config to the rest of the app.

### dht-discovery.ts
BitTorrent DHT peer discovery. Announces the user's Tor onion address and looks up peers by their stealth pubkey hash. No central server; peers are discovered via the DHT swarm.

### onion-server.ts / onion-client.ts / onion-probe.ts
Tor v3 onion service management. `onion-server.ts` creates an ephemeral onion service for incoming connections. `onion-client.ts` connects to a peer's onion address. `onion-probe.ts` checks reachability.

### noise-session.ts
Holds in-progress Noise_XX handshake state for peer connections. The handshake produces a shared secret used to derive session encryption keys.

### nostr-delivery.ts
Fallback offline delivery via Nostr NIP-59 gift-wrap. When a peer is not reachable via DHT/Tor, messages are wrapped with NIP-59 and published to Nostr relays.

### call-orchestrator.ts
WebRTC-over-Tor call state machine. Manages signaling (via Nostr), ICE candidate exchange, and call lifecycle (initiate, accept, hang up).

### audio-bridge.ts
Routes raw audio frames between the WebRTC peer connection and the renderer. The renderer sends/receives audio as `ArrayBuffer` via IPC.
