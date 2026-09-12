# contracts/script — Deploy & Migration Scripts

## DeployAndMigrate.s.sol (primary)

The canonical deploy script. Deploys all five contracts in dependency order, wires them together (sets `WeaveRegistrar` as the authorized writer on `WeavePermissionedRegistry` and `WeaveRoleRegistry`), and logs all deployed addresses to stdout.

```bash
forge script script/DeployAndMigrate.s.sol \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_KEY \
  --broadcast
```

After running, copy the printed addresses into:
- `app/main/addresses.ts`
- `app/renderer/lib/addresses.ts`

Also run `script/update-addresses.sh` if you have it wired to do this automatically.

## DeployWeave.s.sol

Earlier deploy script used before the migration pattern was introduced. Deploys the core contracts only, without the migration helpers. Use `DeployAndMigrate.s.sol` instead for full deployments.

## RedeployRegistry.s.sol

Redeploys only `WeavePermissionedRegistry` and re-wires `WeaveRegistrar` to point at the new registry. Use when the registry needs to be replaced without touching the registrar or resolver (e.g. storage layout migration).

## ReenrollMembers.s.sol

Re-runs member enrollment for a list of members against a freshly deployed registry. Used after a registry redeploy to restore member state. Reads member list from a JSON file or hardcoded addresses in the script.

## RegisterMembers.s.sol

Batch-registers a set of members into an existing org. Useful for bootstrapping an org with known members without going through the UI.

## update-addresses.sh

Shell script that extracts deployed addresses from `forge script` broadcast output and patches them into the TypeScript address files. Run after any deploy that changes contract addresses.
