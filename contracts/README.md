# Weave Contracts

Foundry project implementing the ENS-based identity, access control, and notification infrastructure for Weave. All contracts are deployed on Ethereum Sepolia.

## What These Contracts Do

Weave uses ENSv2 `*.weave.eth` subnames as the identity layer. Every user, org, and org member gets a subname. Access control is encoded as a 256-bit EAC (Ethereum Access Control) bitmap stored per member in the ENS registry. The contracts handle org creation, member enrollment, role management, and wildcard ENS resolution — all without per-user on-chain registration costs.

## Contracts

### WeaveRegistrar (`src/WeaveRegistrar.sol`)
The central gatekeeper. Only this contract can write to `WeavePermissionedRegistry`. Exposes the full lifecycle:
- `registerOrg(orgName)` — creates `orgname.weave.eth`
- `enrollMember(orgName, memberName, memberAddress)` — creates `membername.orgname.weave.eth` and sets initial EAC bitmap
- `grantOrgRole / revokeOrgRole` — set/clear built-in role bits in the EAC bitmap
- `defineOrgRole(orgName, nybble, slug, displayName, description, color)` — registers a custom role in WeaveRoleRegistry (nybbles 16–63)
- `grantNamedRole / revokeNamedRole` — apply/remove a custom role by slug
- `addSubAdmin / removeSubAdmin` — grant/revoke sub-admin privileges

### WeaveRoleRegistry (`src/WeaveRoleRegistry.sol`)
Stores custom org role definitions keyed by `(orgNameHash, nybble)`. Only `WeaveRegistrar` can write. Roles occupy nybbles 16–63 of the EAC bitmap. Each role has: slug, displayName, description, color, active flag.

### WeaveWildcardResolver (`src/WeaveWildcardResolver.sol`)
Wildcard ENS resolver for all `*.weave.eth` names. Stores text records per name:
- `stealth.view` — secp256k1 stealth view key (hex)
- `stealth.spend` — secp256k1 stealth spend key (hex)
- `noise.pub` — X25519 public key for Noise_XX (hex)
- `onion` — Tor v3 onion address
- `nostr.pub` — Nostr public key

### WeavePermissionedRegistry (`src/WeavePermissionedRegistry.sol`)
ENS registry fork with write access restricted to `WeaveRegistrar`. Stores owner, resolver, and TTL per node.

### NotificationLog (`src/NotificationLog.sol`)
On-chain append-only log for push notifications. Clients poll this contract for events addressed to their ENS node.

## ENS Subname Scheme

```
weave.eth                          (root — not user-controlled)
├── alice.weave.eth                (individual user)
├── acme.weave.eth                 (org)
│   ├── alice.acme.weave.eth      (org member)
│   └── bob.acme.weave.eth        (org member)
```

## EAC Bitmap Layout

The 256-bit access control bitmap is stored per member. Each nybble (4 bits) represents one role:

| Nybble(s) | Role | Value |
|-----------|------|-------|
| 0 | ROLE_REGISTRAR | 0x1 |
| 1 | ROLE_MODERATOR | 0x10 |
| 2 | ROLE_PUBLISHER | 0x100 |
| 3 | ROLE_VIEWER | 0x1000 |
| 4 | ROLE_AUDITOR | 0x10000 |
| 5 | ROLE_BOT | 0x100000 |
| 6 | ROLE_GUEST | 0x1000000 |
| 7 | ROLE_BILLING | 0x10000000 |
| 8–15 | Reserved | — |
| 16–63 | Org custom roles | defined via `defineOrgRole` |

## Deployed Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| WeavePermissionedRegistry | `0x38E5F605bE16c4A54d0a1CF5A6E75DFF1679EFf3` |
| WeaveWildcardResolver | `0xE324fB0Fb00621094B8e81EA71E28D4263445377` |
| WeaveRegistrar | `0x47f73c5F82a43Cc4b3a007131Af0E84543146950` |
| NotificationLog | `0x8106E27a1FDE848Bf7A41fE90207A0e4Aa0dE849` |

- Chain: Sepolia (11155111)
- Explorer: https://sepolia.etherscan.io

## Build & Test

```bash
forge build
forge test
forge test -vvv           # verbose output
forge snapshot            # gas snapshots
```

## Deploy

```bash
# Full deploy — deploys all contracts and wires them together
forge script script/DeployAndMigrate.s.sol \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_KEY \
  --broadcast

# After deploy, update addresses in:
#   app/main/addresses.ts
#   app/renderer/lib/addresses.ts
```

See `script/README.md` for descriptions of all deploy scripts.
