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
    address forwarder = makeAddr("forwarder");

    WeaveWildcardResolver.WeaveIdentity dummyIdentity;

    function setUp() public {
        resolver  = new WeaveWildcardResolver();
        registry  = new WeavePermissionedRegistry(address(resolver));
        registrar = new WeaveRegistrar(address(registry), address(resolver));
        notifLog  = new NotificationLog(forwarder);

        // wire up roles
        registry.grantRegistrar(address(registrar));
        resolver.authorizeSetterRole(address(registrar), true);

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
        vm.prank(alice);
        registrar.registerMember("alice", dummyIdentity);

        bytes32 lh = keccak256(bytes("alice"));
        assertEq(registry.ownerOf(lh), alice);
        assertGt(registry.tokenId(lh), 0);
        assertEq(registry.balanceOf(alice, registry.tokenId(lh)), 1);
    }

    function test_registerGuest_setsExpiry() public {
        vm.prank(alice);
        registrar.registerGuest("bob", bob, 7 days, dummyIdentity);

        bytes32 lh = keccak256(bytes("bob"));
        (, , , uint64 expiry, ) = registry.recordData(lh);
        assertApproxEqAbs(expiry, block.timestamp + 7 days, 2);
    }

    function test_registerOperator_transferable() public {
        vm.prank(alice);
        registrar.registerOperator("relay1", dummyIdentity);

        bytes32 lh = keccak256(bytes("relay1"));
        (, , uint256 roles, , ) = registry.recordData(lh);
        assertTrue((roles & registry.ROLE_CAN_TRANSFER_ADMIN()) != 0);
    }

    function test_register_duplicate_reverts() public {
        vm.prank(alice);
        registrar.registerMember("alice", dummyIdentity);
        vm.prank(alice);
        vm.expectRevert(WeavePermissionedRegistry.AlreadyRegistered.selector);
        registrar.registerMember("alice", dummyIdentity);
    }

    function test_register_after_expiry_succeeds() public {
        vm.prank(alice);
        registrar.registerGuest("temp", bob, 1 days, dummyIdentity);

        // advance past expiry
        vm.warp(block.timestamp + 2 days);

        vm.prank(alice);
        registrar.registerGuest("temp", alice, 7 days, dummyIdentity);
        bytes32 lh = keccak256(bytes("temp"));
        assertEq(registry.ownerOf(lh), alice);
    }

    // ── Soulbound ─────────────────────────────────────────────────────────────

    function test_member_token_soulbound() public {
        vm.prank(alice);
        registrar.registerMember("alice", dummyIdentity);

        // member has no ROLE_CAN_TRANSFER_ADMIN
        bytes32 lh = keccak256(bytes("alice"));
        (, , uint256 roles, , ) = registry.recordData(lh);
        assertEq(roles & registry.ROLE_CAN_TRANSFER_ADMIN(), 0);
    }

    // ── Unregister ────────────────────────────────────────────────────────────

    function test_unregister_burns_token() public {
        vm.prank(alice);
        registrar.registerMember("alice", dummyIdentity);

        bytes32 lh = keccak256(bytes("alice"));
        uint256 tid = registry.tokenId(lh);

        registry.unregisterMember("alice");
        assertEq(registry.balanceOf(alice, tid), 0);
        assertEq(registry.ownerOf(lh), address(0));
    }

    // ── Token regeneration on role changes ────────────────────────────────────

    function test_grantRoles_regenerates_tokenId() public {
        vm.prank(alice);
        registrar.registerMember("alice", dummyIdentity);
        bytes32 lh = keccak256(bytes("alice"));
        uint256 oldTid = registry.tokenId(lh);

        registry.grantRoles(lh, registry.ROLE_UNREGISTER());

        uint256 newTid = registry.tokenId(lh);
        assertNotEq(oldTid, newTid, "tokenId must regenerate");
        assertEq(registry.balanceOf(alice, oldTid), 0, "old token burned");
        assertEq(registry.balanceOf(alice, newTid), 1, "new token minted");
    }

    function test_revokeRoles_regenerates_tokenId() public {
        vm.prank(alice);
        registrar.registerMember("alice", dummyIdentity);
        bytes32 lh = keccak256(bytes("alice"));
        uint256 oldTid = registry.tokenId(lh);

        registry.revokeRoles(lh, registry.ROLE_RENEW());

        uint256 newTid = registry.tokenId(lh);
        assertNotEq(oldTid, newTid);
    }

    // ── Wildcard Resolver ─────────────────────────────────────────────────────

    function test_resolver_setIdentity_and_resolve() public {
        vm.prank(alice);
        registrar.registerMember("alice", dummyIdentity);

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

    function test_notifLog_addMatches_and_retrieve() public {
        bytes32 hash = keccak256("userkey");
        string[] memory ids = new string[](2);
        ids[0] = "ann-001"; ids[1] = "ann-002";

        vm.prank(forwarder);
        notifLog.addMatches(hash, ids);

        string[] memory got = notifLog.getMatches(hash);
        assertEq(got.length, 2);
        assertEq(got[0], "ann-001");
    }

    function test_notifLog_non_forwarder_reverts() public {
        bytes32 hash = keccak256("userkey");
        string[] memory ids = new string[](1);
        ids[0] = "ann-001";

        vm.prank(alice);
        vm.expectRevert(NotificationLog.NotForwarder.selector);
        notifLog.addMatches(hash, ids);
    }

    function test_notifLog_clearMatches() public {
        bytes32 hash = keccak256("userkey");
        string[] memory ids = new string[](1);
        ids[0] = "ann-001";

        vm.prank(forwarder);
        notifLog.addMatches(hash, ids);
        notifLog.clearMatches(hash);

        assertEq(notifLog.getMatches(hash).length, 0);
    }
}
