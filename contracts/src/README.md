# contracts/src — Solidity Sources

## WeaveRegistrar.sol

The single write authority for the entire Weave ENS registry. All org/member/role mutations go through this contract. It enforces access control (only the org admin or a sub-admin can call most functions), emits events for indexing, and delegates custom role storage to `WeaveRoleRegistry`. Key functions: `registerOrg`, `enrollMember`, `grantOrgRole`, `revokeOrgRole`, `defineOrgRole`, `grantNamedRole`, `revokeNamedRole`, `addSubAdmin`, `removeSubAdmin`.

## WeaveRoleRegistry.sol

Stores org-defined custom role definitions. Only `WeaveRegistrar` can write to it. Each role is keyed by `(orgNameHash, nybble)` where nybble is in the range 16–63. A role record contains: `slug` (short identifier), `displayName`, `description`, `color` (hex string), `active` flag, and the precomputed `bitmap` (1 shifted left by nybble × 4 bits). The app reads this registry to display available roles in the admin panel.

## WeaveWildcardResolver.sol

Implements the ENS wildcard resolver interface for `*.weave.eth`. Stores text records keyed by ENS node hash. The app writes cryptographic identity material here during enrollment: stealth view/spend keys, X25519 noise pubkey, Tor onion address, and Nostr pubkey. When another client resolves `alice.acme.weave.eth`, they hit this resolver to get Alice's complete identity bundle.

## WeavePermissionedRegistry.sol

A minimal ENS registry (owner, resolver, TTL per node) with write access gated to `WeaveRegistrar`. Prevents any external party from registering subnames under `weave.eth` without going through the registrar's access control logic.

## NotificationLog.sol

An append-only on-chain log. Any contract or address can emit a notification targeting an ENS node. Clients poll for events filtered by their own node hash to receive push-style notifications (e.g. invite to an org, role change) without a centralized push service.
