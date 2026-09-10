// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {WeavePermissionedRegistry} from "../src/WeavePermissionedRegistry.sol";
import {WeaveWildcardResolver} from "../src/WeaveWildcardResolver.sol";
import {WeaveRegistrar} from "../src/WeaveRegistrar.sol";
import {NotificationLog} from "../src/NotificationLog.sol";

contract WeaveRegistryTest is Test {
    WeaveWildcardResolver     resolver;
    WeavePermissionedRegistry registry;
    WeaveRegistrar            registrar;
    NotificationLog           notifLog;

    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");
    address keystoneForwarder = makeAddr("keystoneForwarder");

    WeaveWildcardResolver.WeaveIdentity dummyIdentity;

    function setUp() public {
        resolver  = new WeaveWildcardResolver();
        registry  = new WeavePermissionedRegistry(address(resolver));
        registrar = new WeaveRegistrar(address(registry), address(resolver));
        notifLog  = new NotificationLog(keystoneForwarder);

        // wire up roles
        registry.grantRegistrar(address(registrar));
        resolver.authorizeSetterRole(address(registrar), true);
        // test contract is also a registrar so it can call grantRoles/revokeRoles directly
        registry.grantRegistrar(address(this));

        dummyIdentity = WeaveWildcardResolver.WeaveIdentity({
            stealthViewKey:  hex"02aabbccdd",
            stealthSpendKey: hex"03aabbccdd",
            x25519Pubkey:    hex"aabbccddee",
            onionAddress:    bytes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.onion"),
            nostrPubkey:     hex"aabbccddeeaabbccddeeaabbccddeeaabbccddeeaabbccddeeaabbccddeeaabb",
            registeredAt:    uint64(block.timestamp)
        });
    }

    // ── Registration ──────────────────────────────────────────────────────────

    function test_registerMember_mintsToken() public {
        // registerMember is onlyOwner; test contract is the deployer/owner
        registrar.registerMember("alice", alice, dummyIdentity);

        bytes32 lh = keccak256(bytes("alice"));
        assertEq(registry.ownerOf(lh), alice);
        assertGt(registry.tokenId(lh), 0);
        assertEq(registry.balanceOf(alice, registry.tokenId(lh)), 1);
    }

    function test_registerGuest_setsExpiry() public {
        registrar.registerGuest("bob", bob, 7 days, dummyIdentity);

        bytes32 lh = keccak256(bytes("bob"));
        (, , , uint64 expiry, ) = registry.recordData(lh);
        assertApproxEqAbs(expiry, block.timestamp + 7 days, 2);
    }

    function test_registerOperator_transferable() public {
        registrar.registerOperator("relay1", alice, dummyIdentity);

        bytes32 lh = keccak256(bytes("relay1"));
        (, , uint256 roles, , ) = registry.recordData(lh);
        assertTrue((roles & registry.ROLE_CAN_TRANSFER_ADMIN()) != 0);
    }

    function test_register_duplicate_reverts() public {
        registrar.registerMember("alice", alice, dummyIdentity);
        vm.expectRevert(WeavePermissionedRegistry.AlreadyRegistered.selector);
        registrar.registerMember("alice", alice, dummyIdentity);
    }

    function test_register_after_expiry_succeeds() public {
        registrar.registerGuest("temp", bob, 1 days, dummyIdentity);

        // advance past expiry
        vm.warp(block.timestamp + 2 days);

        registrar.registerGuest("temp", alice, 7 days, dummyIdentity);
        bytes32 lh = keccak256(bytes("temp"));
        assertEq(registry.ownerOf(lh), alice);
    }

    // ── Soulbound ─────────────────────────────────────────────────────────────

    function test_member_token_soulbound() public {
        registrar.registerMember("alice", alice, dummyIdentity);

        // member has no ROLE_CAN_TRANSFER_ADMIN
        bytes32 lh = keccak256(bytes("alice"));
        (, , uint256 roles, , ) = registry.recordData(lh);
        assertEq(roles & registry.ROLE_CAN_TRANSFER_ADMIN(), 0);
    }

    // ── Unregister ────────────────────────────────────────────────────────────

    function test_unregister_burns_expired_token() public {
        vm.prank(address(this));
        registrar.registerGuest("tempguest", alice, 1 days, dummyIdentity);

        bytes32 lh = keccak256(bytes("tempguest"));
        uint256 tid = registry.tokenId(lh);

        // Warp past expiry
        vm.warp(block.timestamp + 2 days);
        registry.unregisterMember("tempguest");

        assertEq(registry.balanceOf(alice, tid), 0);
        assertEq(registry.ownerOf(lh), address(0));
    }

    function test_unregister_unexpired_member_reverts() public {
        vm.prank(address(this));
        registrar.registerMember("alice", alice, dummyIdentity);
        // member token is non-expiring and not GUEST_ROLES — cannot be forcibly burned
        vm.expectRevert("token not expired");
        registry.unregisterMember("alice");
    }

    // ── Token regeneration on role changes ────────────────────────────────────

    function test_grantRoles_regenerates_tokenId() public {
        registrar.registerMember("alice", alice, dummyIdentity);
        bytes32 lh = keccak256(bytes("alice"));
        uint256 oldTid = registry.tokenId(lh);

        registry.grantRoles(lh, registry.ROLE_UNREGISTER());

        uint256 newTid = registry.tokenId(lh);
        assertNotEq(oldTid, newTid, "tokenId must regenerate");
        assertEq(registry.balanceOf(alice, oldTid), 0, "old token burned");
        assertEq(registry.balanceOf(alice, newTid), 1, "new token minted");
    }

    function test_revokeRoles_regenerates_tokenId() public {
        registrar.registerMember("alice", alice, dummyIdentity);
        bytes32 lh = keccak256(bytes("alice"));
        uint256 oldTid = registry.tokenId(lh);

        registry.revokeRoles(lh, registry.ROLE_RENEW());

        uint256 newTid = registry.tokenId(lh);
        assertNotEq(oldTid, newTid);
    }

    // ── Wildcard Resolver ─────────────────────────────────────────────────────

    function test_resolver_setIdentity_and_resolve() public {
        registrar.registerMember("alice", alice, dummyIdentity);

        bytes32 lh = keccak256(bytes("alice"));
        // Build DNS-encoded name: \x05alice\x05weave\x03eth\x00
        bytes memory dnsName = abi.encodePacked(
            uint8(5), "alice",
            uint8(5), "weave",
            uint8(3), "eth",
            uint8(0)
        );
        bytes memory callData = abi.encodeWithSelector(
            bytes4(0x59d1d43c),
            lh,
            "crypto.stealth.view"
        );
        bytes memory result = resolver.resolve(dnsName, callData);
        // result is abi.encode(string) — non-empty means identity set
        assertTrue(result.length > 0);
    }

    function test_resolver_unauthorized_setIdentity_reverts() public {
        bytes32 lh = keccak256(bytes("alice"));
        vm.prank(alice);
        vm.expectRevert(WeaveWildcardResolver.NotAuthorized.selector);
        resolver.setIdentity(lh, dummyIdentity);
    }

    // ── NotificationLog ───────────────────────────────────────────────────────

    function test_notifLog_onReport_and_retrieve() public {
        bytes32 hash = keccak256("userkey");
        string[] memory ids = new string[](2);
        ids[0] = "ann-001"; ids[1] = "ann-002";

        bytes memory report = abi.encode(hash, ids);
        bytes memory metadata = new bytes(64); // 64-byte KeystoneForwarder metadata

        vm.prank(keystoneForwarder);
        notifLog.onReport(metadata, report);

        string[] memory got = notifLog.getMatches(hash);
        assertEq(got.length, 2);
        assertEq(got[0], "ann-001");
    }

    function test_notifLog_onReport_non_forwarder_reverts() public {
        bytes memory report = abi.encode(keccak256("userkey"), new string[](0));
        bytes memory metadata = new bytes(64);

        vm.prank(alice);
        vm.expectRevert(NotificationLog.NotForwarder.selector);
        notifLog.onReport(metadata, report);
    }

    function test_notifLog_addMatchesDirect_and_retrieve() public {
        bytes32 hash = keccak256("userkey");
        string[] memory ids = new string[](1);
        ids[0] = "ann-001";

        // owner (test contract) can use addMatchesDirect for testing
        notifLog.addMatchesDirect(hash, ids);

        string[] memory got = notifLog.getMatches(hash);
        assertEq(got.length, 1);
    }

    function test_notifLog_clearMatches_by_owner() public {
        bytes32 hash = keccak256("userkey");
        string[] memory ids = new string[](1);
        ids[0] = "ann-001";

        notifLog.addMatchesDirect(hash, ids);
        // owner (this test contract) can clear — pass empty preimage
        notifLog.clearMatches(hash, "");
        assertEq(notifLog.getMatches(hash).length, 0);
    }

    function test_notifLog_clearMatches_by_keyholder() public {
        bytes memory spendPub = hex"0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
        bytes32 hash = sha256(spendPub);
        string[] memory ids = new string[](1);
        ids[0] = "ann-002";

        notifLog.addMatchesDirect(hash, ids);
        // any address can clear by proving preimage
        vm.prank(alice);
        notifLog.clearMatches(hash, spendPub);
        assertEq(notifLog.getMatches(hash).length, 0);
    }

    function test_notifLog_clearMatches_non_owner_reverts() public {
        bytes32 hash = keccak256("userkey");
        vm.prank(alice);
        vm.expectRevert(NotificationLog.NotForwarder.selector);
        notifLog.clearMatches(hash, "");
    }

    function test_notifLog_supportsInterface() public view {
        // IReceiver: 0x35b16d3d
        assertTrue(notifLog.supportsInterface(0x35b16d3d));
        // ERC-165
        assertTrue(notifLog.supportsInterface(0x01ffc9a7));
    }
}
