#!/usr/bin/env bash
# Run after forge broadcast to pull new addresses into app/main/addresses.ts
set -e

BROADCAST_DIR="$(dirname "$0")/../broadcast/DeployAndMigrate.s.sol/11155111"
JSON="$BROADCAST_DIR/run-latest.json"

if [ ! -f "$JSON" ]; then
  echo "ERROR: $JSON not found. Run the broadcast first."
  exit 1
fi

pick() {
  python3 -c "
import json, sys
d = json.load(open('$JSON'))
for tx in d['transactions']:
    if tx.get('contractName') == '$1':
        print(tx['contractAddress'].lower()); break
"
}

resolver=$(pick WeaveWildcardResolver)
registry=$(pick WeavePermissionedRegistry)
registrar=$(pick WeaveRegistrar)
notif=$(pick NotificationLog)

# Checksum via cast
cs() { /Users/I740422/.foundry/bin/cast to-checksum-address "$1" 2>/dev/null || echo "$1"; }
resolver=$(cs "$resolver")
registry=$(cs "$registry")
registrar=$(cs "$registrar")
notif=$(cs "$notif")

ADDRS="$(dirname "$0")/../../app/main/addresses.ts"

cat > "$ADDRS" << TSEOF
/**
 * Deployed contract addresses on Ethereum Sepolia.
 */
export const ADDRESSES = {
  WeavePermissionedRegistry: '$registry' as \`0x\${string}\`,
  WeaveWildcardResolver:     '$resolver' as \`0x\${string}\`,
  WeaveRegistrar:            '$registrar' as \`0x\${string}\`,
  NotificationLog:           '$notif' as \`0x\${string}\`,
} as const

export const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/alch_I7RtHwdMsa590uGHCV6jt'
export const CHAIN_ID = 11155111
TSEOF

echo "✓ Updated $ADDRS"
echo "  WeaveWildcardResolver:     $resolver"
echo "  WeavePermissionedRegistry: $registry"
echo "  WeaveRegistrar:            $registrar"
echo "  NotificationLog:           $notif"
