# contracts/test — Forge Tests

## WeaveRegistry.t.sol

Full lifecycle integration test for the Weave contract suite. Covers:
- Org registration (`registerOrg`)
- Member enrollment (`enrollMember`)
- Built-in role grant/revoke (`grantOrgRole`, `revokeOrgRole`)
- Custom role definition (`defineOrgRole`)
- Named role grant/revoke (`grantNamedRole`, `revokeNamedRole`)
- Sub-admin add/remove (`addSubAdmin`, `removeSubAdmin`)
- Access control assertions (non-admin calls must revert)
- Text record storage and retrieval via `WeaveWildcardResolver`
- Notification log emission

## Running Tests

```bash
# Run all tests
forge test

# Verbose output (shows logs and traces)
forge test -vvv

# Run a specific test function
forge test --match-test testEnrollMember -vvv

# Gas report
forge test --gas-report
```

## Test Setup

Tests use Foundry's `vm.prank` to simulate calls from different accounts (deployer, org admin, member, unauthorized third party). The deployer address is `0x04019773758B0b747bc5379867e68EB577E9f26F` on Sepolia; in tests this is replaced by `address(this)` or a derived test account.
