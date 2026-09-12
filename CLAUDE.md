# Weave — Repo Navigation Guide

Weave is a decentralized, privacy-first collaboration platform with Microsoft Teams feature parity. No IP is ever exposed to any relay — both endpoints run as Tor v3 onion services. Identity is ENSv2 `*.weave.eth` subnames on Ethereum. Messages live on Arkiv, a decentralized Ethereum-native data layer.

## Repo Layout

```
weave/
├── app/              # Electron desktop app (main + renderer processes)
├── contracts/        # Foundry smart contracts (ENS registry, registrar, resolver)
├── cre-workflow/     # Confidential Runtime Environment — Go WASM for ENS writes
├── docs/             # Architecture and feature docs
├── scripts/          # Utility scripts
└── landing/          # Landing page (static)
```

## How ENS Is Used

Every Weave identity is an ENSv2 subname under `weave.eth`:
- **Users** → `alice.weave.eth`
- **Orgs** → `acme.weave.eth`
- **Members** → `alice.acme.weave.eth`

The wildcard resolver (`WeaveWildcardResolver`) handles all `*.weave.eth` lookups without per-user on-chain registration cost. Text records on each name store the user's cryptographic identity bundle: stealth view/spend keys, Noise X25519 pubkey, Tor onion address, and Nostr pubkey.

Access control uses the **EAC (Ethereum Access Control) bitmap** — a 256-bit value stored per member in the ENS registry:

| Nybbles | Meaning |
|---------|---------|
| 0       | ROLE_REGISTRAR (0x1) |
| 1–7     | Built-in roles: MODERATOR, PUBLISHER, VIEWER, AUDITOR, BOT, GUEST, BILLING |
| 8–15    | Reserved |
| 16–63   | Org-defined custom roles (stored in WeaveRoleRegistry) |

Only `WeaveRegistrar` can write to the registry. The registrar handles: `registerOrg`, `enrollMember`, `grantOrgRole`, `revokeOrgRole`, `defineOrgRole`, `grantNamedRole`, `revokeNamedRole`, `addSubAdmin`, `removeSubAdmin`.

## How CRE Is Used

The **Confidential Runtime Environment** (`cre-workflow/`) is a Go WASM binary that wraps ENS write operations. It submits Ethereum transactions without exposing the private key to the renderer process. The workflow is defined in `workflow.yaml`; `main.go` implements the steps; `cre-workflow.wasm` is the compiled artifact loaded at runtime.

## IPC Architecture (main ↔ renderer)

```
renderer (React)
  └─ window.weave.*          ← contextBridge surface (preload.ts)
       └─ ipcRenderer.invoke(channel, args)
            └─ ipcMain.handle(channel, handler)   ← ipc-handlers.ts
                 └─ loadIdentity() + deriveKeysFromSeed()
                      └─ ethPrivKey → viem walletClient → on-chain tx
```

All ENS writes go through `app/main/ipc-handlers.ts`. The handler loads the stored seed phrase via `loadIdentity()`, derives the ETH private key with `deriveKeysFromSeed()`, builds a viem wallet client, and submits the transaction. **Never** use `keychainGet` or a module-level client — always derive inline per handler.

BigInt values from viem cannot cross the contextBridge (structured-clone restriction). Map them to strings before returning from any handler.

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| WeavePermissionedRegistry | `0x38E5F605bE16c4A54d0a1CF5A6E75DFF1679EFf3` |
| WeaveWildcardResolver | `0xE324fB0Fb00621094B8e81EA71E28D4263445377` |
| WeaveRegistrar | `0x47f73c5F82a43Cc4b3a007131Af0E84543146950` |
| NotificationLog | `0x8106E27a1FDE848Bf7A41fE90207A0e4Aa0dE849` |

- Chain: Ethereum Sepolia (chainId 11155111)
- RPC: `https://eth-sepolia.g.alchemy.com/v2/alch_I7RtHwdMsa590uGHCV6jt`
- Explorer: `https://sepolia.etherscan.io`

Address files are duplicated in two places (main and renderer have separate module boundaries):
- `app/main/addresses.ts`
- `app/renderer/lib/addresses.ts`

Keep both in sync after any redeployment.

## Key Files to Know

| File | Purpose |
|------|---------|
| `app/main/ipc-handlers.ts` | All IPC channel registrations; the single source of truth for what the renderer can invoke |
| `app/main/preload.ts` | contextBridge surface — exposes `window.weave.*` |
| `app/renderer/lib/ipc.ts` | Typed wrappers over `window.weave.*` + Window type augmentation |
| `app/renderer/app/page.tsx` | Root React state; channel selection, messaging, key version management |
| `app/renderer/components/admin/OrgAdminPanel.tsx` | Admin UI: member enrollment, role management, sub-admins |
| `app/main/arkiv-manager.ts` | Arkiv wallet client (main process); posts/fetches messages, manages channel keys |
| `app/renderer/lib/arkiv-poller.ts` | Renderer-side interval poller for new Arkiv messages |
| `app/renderer/lib/ens.ts` | Read-only ENS helpers using viem public client |
| `contracts/src/WeaveRegistrar.sol` | Core on-chain logic for org/member/role management |
| `contracts/script/DeployAndMigrate.s.sol` | Primary deploy script — deploys and wires all contracts |

## Dev Workflow

```bash
# Run the Electron app
cd app
npm install
npm run dev

# Contracts
cd contracts
forge build
forge test
forge script script/DeployAndMigrate.s.sol --rpc-url $RPC_URL --broadcast

# CRE workflow (requires Go + WASM toolchain)
cd cre-workflow
GOOS=js GOARCH=wasm go build -o cre-workflow.wasm
```

## Chain — Ethereum Only

All contracts are Ethereum (Sepolia). There is no Starknet integration.
