// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {WeaveWildcardResolver} from "../src/WeaveWildcardResolver.sol";
import {WeaveRegistrar} from "../src/WeaveRegistrar.sol";
import {WeaveRoleRegistry} from "../src/WeaveRoleRegistry.sol";
import {NotificationLog} from "../src/NotificationLog.sol";

/// @dev Minimal ERC-1155 receiver so the ENSv2 registry's safeTransferFrom doesn't revert.
contract ERC1155Wallet {
    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external pure returns (bytes4)
    {
        return 0xf23a6e61; // IERC1155Receiver.onERC1155Received.selector
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata)
        external pure returns (bytes4)
    {
        return 0xbc197c81; // IERC1155Receiver.onERC1155BatchReceived.selector
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0xf23a6e61 || interfaceId == 0xbc197c81 || interfaceId == 0x01ffc9a7;
    }
}

// Live ENSv2 PermissionedRegistry interface
interface IPermissionedRegistry {
    function register(
        string calldata label,
        address owner,
        address subregistry,
        address resolver,
        uint256 roleBitmap,
        uint64 expiry
    ) external returns (uint256 tokenId);

    function findOwner(string calldata label) external view returns (address);
    function findTokenId(string calldata label) external view returns (uint256);
    function findExpiry(string calldata label) external view returns (uint64);
    function getSubregistry(string calldata label) external view returns (address);
    function roles(uint256 resource, address account) external view returns (uint256);
    function hasRoles(uint256 resource, uint256 roleBitmap, address account) external view returns (bool);
    function grantRoles(uint256 resource, uint256 roleBitmap, address account) external;
    function revokeRoles(uint256 resource, uint256 roleBitmap, address account) external returns (bool);
}

/// @dev All tests run against a Sepolia fork using the real ENSv2 PermissionedRegistry clones.
///      No mock registries — the live contracts are the test environment.
///
///      Run with:
///      FOUNDRY_PROFILE=fork forge test --fork-url $SEPOLIA_RPC -vvv
contract WeaveRegistryTest is Test {
    // ── Live Sepolia addresses ────────────────────────────────────────────────
    address constant FACTORY        = 0xD2a632D8a8b67c2c4398c255CbD7aF8dd7236198;
    address constant REGISTRY_IMPL  = 0x0F99e7Ea74903AfCB7224d0354fD7428A6f92917;
    address constant WEAVE_REGISTRY = 0x38E5F605bE16c4A54d0a1CF5A6E75DFF1679EFf3;
    address constant DEPLOYER       = 0x04019773758B0b747bc5379867e68EB577E9f26F;

    uint256 constant ALL_ROLES =
        0x1111111111111111111111111111111111111111111111111111111111111111;
    uint256 constant ROOT_RESOURCE = 0;

    // ── Contracts deployed in setUp ───────────────────────────────────────────
    WeaveWildcardResolver resolver;
    WeaveRegistrar        registrar;
    NotificationLog       notifLog;

    address keystoneForwarder = makeAddr("keystoneForwarder");
    // ERC-1155 receiver wallets — the ENSv2 registry calls onERC1155Received on the owner
    ERC1155Wallet alice;
    ERC1155Wallet bob;

    WeaveWildcardResolver.WeaveIdentity dummyIdentity;

    function setUp() public {
        // Fork Sepolia so the ENSv2 infrastructure exists
        vm.createSelectFork(vm.envOr("SEPOLIA_RPC", string("https://eth-sepolia.g.alchemy.com/v2/alch_I7RtHwdMsa590uGHCV6jt")));

        // Deploy ERC-1155 receiver wallets (needed because ENSv2 registry mints ERC-1155 tokens)
        alice = new ERC1155Wallet();
        bob   = new ERC1155Wallet();

        // Deploy fresh resolver + registrar (registrar uses live factory + weave clone)
        resolver  = new WeaveWildcardResolver();
        registrar = new WeaveRegistrar(FACTORY, REGISTRY_IMPL, WEAVE_REGISTRY, address(resolver));
        notifLog  = new NotificationLog(keystoneForwarder);

        resolver.authorizeSetterRole(address(registrar), true);

        // Impersonate the deployer (holds ALL_ROLES on ROOT_RESOURCE of the live weave clone).
        // grantRoles reverts on ROOT_RESOURCE per EAC; use grantRootRoles instead.
        vm.startPrank(DEPLOYER);
        (bool ok,) = WEAVE_REGISTRY.call(
            abi.encodeWithSignature("grantRootRoles(uint256,address)", ALL_ROLES, address(registrar))
        );
        require(ok, "grantRootRoles failed");
        vm.stopPrank();

        dummyIdentity = WeaveWildcardResolver.WeaveIdentity({
            stealthViewKey:  hex"02aabbccdd",
            stealthSpendKey: hex"03aabbccdd",
            x25519Pubkey:    hex"aabbccddee",
            onionAddress:    bytes(""),
            nostrPubkey:     hex"aabbccddeeaabbccddeeaabbccddeeaabbccddeeaabbccddeeaabbccddeeaabb",
            ethAddress:      address(alice),
            displayName:     "Alice",
            avatarUrl:       "",
            registeredAt:    uint64(block.timestamp)
        });
    }

    // ── Org registration ──────────────────────────────────────────────────────

    function test_registerOrg_creates_clone_and_registers() public {
        // Use block.number for a unique label each run
        string memory orgLabel = string(abi.encodePacked("testorg", vm.toString(block.number)));

        // alice is an ERC-1155 receiver wallet so it can receive tokens minted by the registry
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        address orgClone = IPermissionedRegistry(WEAVE_REGISTRY).getSubregistry(orgLabel);
        assertTrue(orgClone != address(0), "org subregistry not set");
        assertTrue(orgClone.code.length > 0, "org clone has no code");

        address orgOwner = IPermissionedRegistry(WEAVE_REGISTRY).findOwner(orgLabel);
        assertEq(orgOwner, address(alice));
    }

    function test_enrollMember_registers_inside_org_clone() public {
        string memory orgLabel = string(abi.encodePacked("acmeorg", vm.toString(block.number)));
        // alice is the org admin (ERC-1155 receiver wallet)
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        // Only org admin (alice) can enroll
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        address orgClone = IPermissionedRegistry(WEAVE_REGISTRY).getSubregistry(orgLabel);
        address memberOwner = IPermissionedRegistry(orgClone).findOwner("bob");
        assertEq(memberOwner, address(bob));

        address memberClone = IPermissionedRegistry(orgClone).getSubregistry("bob");
        assertTrue(memberClone != address(0), "member subregistry not set");
        assertTrue(memberClone.code.length > 0, "member clone has no code");
    }

    function test_enrollMember_non_admin_reverts() public {
        string memory orgLabel = string(abi.encodePacked("secureorg", vm.toString(block.number)));
        // alice is admin
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        // bob is not the org admin → must revert
        vm.prank(address(bob));
        vm.expectRevert(WeaveRegistrar.NotOrgAdmin.selector);
        registrar.enrollMember(orgLabel, "carol", address(bob), dummyIdentity);
    }

    function test_registerOrg_duplicate_reverts() public {
        string memory orgLabel = string(abi.encodePacked("duporg", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.expectRevert(WeaveRegistrar.OrgAlreadyExists.selector);
        registrar.registerOrg(orgLabel, address(bob), dummyIdentity);
    }

    // ── Existing live members: google.weave.eth ───────────────────────────────

    function test_live_google_weave_eth_is_registered() public view {
        address googleClone = IPermissionedRegistry(WEAVE_REGISTRY).getSubregistry("google");
        assertTrue(googleClone != address(0), "google not registered");
        assertTrue(googleClone.code.length > 0, "google clone has no code");
    }

    function test_live_philo_inside_google() public view {
        address googleClone = IPermissionedRegistry(WEAVE_REGISTRY).getSubregistry("google");
        address philoOwner  = IPermissionedRegistry(googleClone).findOwner("philo");
        assertTrue(philoOwner != address(0), "philo not registered in google");
    }

    function test_live_google_findExpiry_is_permanent() public view {
        uint64 expiry = IPermissionedRegistry(WEAVE_REGISTRY).findExpiry("google");
        assertEq(expiry, type(uint64).max, "google should be permanent");
    }

    // ── Wildcard resolver ─────────────────────────────────────────────────────

    function test_resolver_setIdentity_and_resolve() public {
        bytes32 lh = keccak256(bytes("testresolve"));
        resolver.authorizeSetterRole(address(this), true);
        resolver.setIdentity(lh, dummyIdentity);

        bytes memory dnsName = abi.encodePacked(
            uint8(11), "testresolve",
            uint8(5),  "weave",
            uint8(3),  "eth",
            uint8(0)
        );
        bytes memory callData = abi.encodeWithSelector(bytes4(0x59d1d43c), lh, "name");
        bytes memory result = resolver.resolve(dnsName, callData);
        string memory name = abi.decode(result, (string));
        assertEq(name, "Alice");
    }

    function test_resolver_unauthorized_setIdentity_reverts() public {
        bytes32 lh = keccak256(bytes("alice"));
        vm.prank(address(alice));
        vm.expectRevert(WeaveWildcardResolver.NotAuthorized.selector);
        resolver.setIdentity(lh, dummyIdentity);
    }

    // ── NotificationLog ───────────────────────────────────────────────────────

    function test_notifLog_onReport_and_retrieve() public {
        bytes32 hash = keccak256("userkey");
        string[] memory ids = new string[](2);
        ids[0] = "ann-001"; ids[1] = "ann-002";

        bytes memory report   = abi.encode(hash, ids);
        bytes memory metadata = new bytes(64);

        vm.prank(keystoneForwarder);
        notifLog.onReport(metadata, report);

        string[] memory got = notifLog.getMatches(hash);
        assertEq(got.length, 2);
        assertEq(got[0], "ann-001");
    }

    function test_notifLog_onReport_non_forwarder_reverts() public {
        bytes memory report   = abi.encode(keccak256("userkey"), new string[](0));
        bytes memory metadata = new bytes(64);

        vm.prank(address(alice));
        vm.expectRevert(NotificationLog.NotForwarder.selector);
        notifLog.onReport(metadata, report);
    }

    function test_notifLog_clearMatches_by_owner() public {
        bytes32 hash = keccak256("userkey");
        string[] memory ids = new string[](1);
        ids[0] = "ann-001";
        notifLog.addMatchesDirect(hash, ids);
        notifLog.clearMatches(hash, "");
        assertEq(notifLog.getMatches(hash).length, 0);
    }

    function test_notifLog_clearMatches_non_owner_reverts() public {
        bytes32 hash = keccak256("userkey");
        vm.prank(address(alice));
        vm.expectRevert(NotificationLog.NotForwarder.selector);
        notifLog.clearMatches(hash, "");
    }

    function test_notifLog_supportsInterface() public view {
        assertTrue(notifLog.supportsInterface(0x35b16d3d)); // IReceiver
        assertTrue(notifLog.supportsInterface(0x01ffc9a7)); // ERC-165
    }

    // ── Phase 1: TXT records ──────────────────────────────────────────────────

    function test_txt_set_and_get_direct() public {
        bytes32 lh = keccak256(bytes("txttest"));
        resolver.authorizeSetterRole(address(this), true);
        resolver.setTxt(lh, "weave.role", "admin");
        assertEq(resolver.getTxt(lh, "weave.role"), "admin");
    }

    function test_txt_overrides_identity_name_field() public {
        // identity has displayName "Alice"; TXT "name" should shadow it
        bytes32 lh = keccak256(bytes("nametxttest"));
        resolver.authorizeSetterRole(address(this), true);
        resolver.setIdentity(lh, dummyIdentity);
        resolver.setTxt(lh, "name", "Bob via TXT");

        bytes memory dnsName = abi.encodePacked(
            uint8(11), "nametxttest",
            uint8(5),  "weave",
            uint8(3),  "eth",
            uint8(0)
        );
        bytes memory callData = abi.encodeWithSelector(bytes4(0x59d1d43c), lh, "name");
        bytes memory result = resolver.resolve(dnsName, callData);
        string memory name = abi.decode(result, (string));
        assertEq(name, "Bob via TXT", "TXT should override identity displayName");
    }

    function test_txt_empty_falls_back_to_identity() public {
        // No TXT set for "name" — identity displayName should be returned
        bytes32 lh = keccak256(bytes("fallbacktest"));
        resolver.authorizeSetterRole(address(this), true);
        resolver.setIdentity(lh, dummyIdentity);

        bytes memory dnsName = abi.encodePacked(
            uint8(12), "fallbacktest",
            uint8(5),  "weave",
            uint8(3),  "eth",
            uint8(0)
        );
        bytes memory callData = abi.encodeWithSelector(bytes4(0x59d1d43c), lh, "name");
        bytes memory result = resolver.resolve(dnsName, callData);
        string memory name = abi.decode(result, (string));
        assertEq(name, "Alice", "should fall back to identity displayName when no TXT");
    }

    function test_txt_unauthorized_reverts() public {
        bytes32 lh = keccak256(bytes("unauth"));
        vm.prank(address(alice));
        vm.expectRevert(WeaveWildcardResolver.NotAuthorized.selector);
        resolver.setTxt(lh, "weave.role", "admin");
    }

    function test_registerOrg_does_not_leak_admin_identity_at_org_label() public {
        string memory orgLabel = string(abi.encodePacked("leaktest", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        // Org slot should have NO identity stored (admin keys must not be exposed there).
        // resolver.identities() returns each field as individual tuple components.
        bytes32 orgLh = keccak256(bytes(orgLabel));
        (
            bytes memory stealthViewKey,
            ,,,,
            address ethAddress,
            ,,
        ) = resolver.identities(orgLh);
        assertEq(ethAddress, address(0), "admin ethAddress must not be stored at org label");
        assertTrue(stealthViewKey.length == 0, "admin stealthViewKey must not be stored at org label");
    }

    function test_registerOrg_sets_weave_role_txt() public {
        string memory orgLabel = string(abi.encodePacked("txtroleorg", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        // org label itself should have weave.role = "org"
        bytes32 orgLh = keccak256(bytes(orgLabel));
        assertEq(resolver.getTxt(orgLh, "weave.role"), "org");

        // admin.<orgLabel> should have weave.role = "admin"
        string memory adminLabel = string(abi.encodePacked("admin.", orgLabel));
        bytes32 adminLh = keccak256(bytes(adminLabel));
        assertEq(resolver.getTxt(adminLh, "weave.role"), "admin");
        assertTrue(bytes(resolver.getTxt(adminLh, "weave.joinedAt")).length > 0, "joinedAt should be set");
    }

    function test_enrollMember_sets_weave_role_member_txt() public {
        string memory orgLabel = string(abi.encodePacked("enrolltxtorg", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        string memory fullLabel = string(abi.encodePacked("bob.", orgLabel));
        bytes32 fullLh = keccak256(bytes(fullLabel));
        assertEq(resolver.getTxt(fullLh, "weave.role"), "member");
        assertTrue(bytes(resolver.getTxt(fullLh, "weave.joinedAt")).length > 0, "joinedAt should be set");
    }

    // ── Phase 2: EAC role grant/revoke ────────────────────────────────────────

    function test_grantOrgRole_promotes_member_to_admin() public {
        string memory orgLabel = string(abi.encodePacked("eacorg", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        // Confirm bob starts as member
        string memory bobLabel = string(abi.encodePacked("bob.", orgLabel));
        bytes32 bobLh = keccak256(bytes(bobLabel));
        assertEq(resolver.getTxt(bobLh, "weave.role"), "member");

        // alice promotes bob
        vm.prank(address(alice));
        registrar.grantOrgRole(orgLabel, "bob", address(bob), 0x1); // ROLE_REGISTRAR

        // EAC bitmap should now be set
        uint256 bitmap = registrar.getMemberRoles(orgLabel, address(bob));
        assertTrue(bitmap & 0x1 != 0, "bob should have ROLE_REGISTRAR");

        // TXT should be updated to "admin"
        assertEq(resolver.getTxt(bobLh, "weave.role"), "admin");
    }

    function test_revokeOrgRole_demotes_admin_to_member() public {
        string memory orgLabel = string(abi.encodePacked("revokeeac", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        vm.prank(address(alice));
        registrar.grantOrgRole(orgLabel, "bob", address(bob), 0x1);

        vm.prank(address(alice));
        registrar.revokeOrgRole(orgLabel, "bob", address(bob), 0x1);

        uint256 bitmap = registrar.getMemberRoles(orgLabel, address(bob));
        assertTrue(bitmap & 0x1 == 0, "bob should not have ROLE_REGISTRAR");
        assertEq(resolver.getTxt(keccak256(bytes(string(abi.encodePacked("bob.", orgLabel)))), "weave.role"), "member");
    }

    function test_transferOrgAdmin_allows_new_admin_to_enroll() public {
        string memory orgLabel = string(abi.encodePacked("xferorg", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        // alice transfers admin to bob
        vm.prank(address(alice));
        registrar.transferOrgAdmin(orgLabel, address(bob));

        // bob can now enroll
        vm.prank(address(bob));
        registrar.enrollMember(orgLabel, "carol", address(alice), dummyIdentity);

        // alice can no longer act as admin
        vm.prank(address(alice));
        vm.expectRevert(WeaveRegistrar.NotOrgAdmin.selector);
        registrar.enrollMember(orgLabel, "dave", address(bob), dummyIdentity);
    }

    function test_grantOrgRole_non_admin_reverts() public {
        string memory orgLabel = string(abi.encodePacked("grantfail", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        // bob tries to grant himself — not allowed
        vm.prank(address(bob));
        vm.expectRevert(WeaveRegistrar.NotOrgAdmin.selector);
        registrar.grantOrgRole(orgLabel, "bob", address(bob), 0x1);
    }

    // ─── Phase 1: weave.roleBitmap and weave.roles TXT synced ────────────────

    function test_grantOrgRole_syncs_roleBitmap_txt() public {
        string memory orgLabel = string(abi.encodePacked("bitmaptxt", vm.toString(block.number)));
        uint256 roleMod = registrar.ROLE_MODERATOR();
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        // Grant moderator (0x10) to bob
        vm.prank(address(alice));
        registrar.grantOrgRole(orgLabel, "bob", address(bob), roleMod);

        bytes32 bobLh = keccak256(bytes(string(abi.encodePacked("bob.", orgLabel))));
        // roleBitmap TXT should reflect 0x10
        assertEq(resolver.getTxt(bobLh, "weave.roleBitmap"), "0x10");
        // primary role should be "moderator"
        assertEq(resolver.getTxt(bobLh, "weave.role"), "moderator");
        // roles list should contain "moderator"
        assertEq(resolver.getTxt(bobLh, "weave.roles"), "moderator");
    }

    function test_grantOrgRole_compound_roles_list() public {
        string memory orgLabel = string(abi.encodePacked("compound", vm.toString(block.number)));
        uint256 compound = registrar.ROLE_REGISTRAR() | registrar.ROLE_MODERATOR();
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        // Grant ROLE_REGISTRAR | ROLE_MODERATOR
        vm.prank(address(alice));
        registrar.grantOrgRole(
            orgLabel, "bob", address(bob),
            compound
        );

        bytes32 bobLh = keccak256(bytes(string(abi.encodePacked("bob.", orgLabel))));
        assertEq(resolver.getTxt(bobLh, "weave.role"), "admin");
        // roles list should contain both
        string memory roles = resolver.getTxt(bobLh, "weave.roles");
        assertTrue(bytes(roles).length > 0, "roles should not be empty");
    }

    function test_revokeOrgRole_updates_bitmap_txt() public {
        string memory orgLabel = string(abi.encodePacked("revbmp", vm.toString(block.number)));
        uint256 roleMod = registrar.ROLE_MODERATOR();
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        vm.prank(address(alice));
        registrar.grantOrgRole(orgLabel, "bob", address(bob), roleMod);
        vm.prank(address(alice));
        registrar.revokeOrgRole(orgLabel, "bob", address(bob), roleMod);

        bytes32 bobLh = keccak256(bytes(string(abi.encodePacked("bob.", orgLabel))));
        assertEq(resolver.getTxt(bobLh, "weave.role"), "member");
        assertEq(resolver.getTxt(bobLh, "weave.roleBitmap"), "0x0");
        assertEq(resolver.getTxt(bobLh, "weave.roles"), "member");
    }

    // ─── Phase 1: Custom org role definition ─────────────────────────────────

    function test_defineOrgRole_stores_in_registry_and_txt() public {
        string memory orgLabel = string(abi.encodePacked("customrole", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        registrar.defineOrgRole(
            orgLabel, 16, "legal-reviewer",
            "Legal Reviewer", "Can read contracts", "#7c3aed"
        );

        // Check registry
        WeaveRoleRegistry.RoleDef memory rd =
            registrar.roleRegistry().getRoleBySlug(keccak256(bytes(orgLabel)), "legal-reviewer");
        assertTrue(rd.active, "role should be active");
        assertEq(rd.slug, "legal-reviewer");
        assertEq(rd.nybble, 16);
        assertEq(rd.displayName, "Legal Reviewer");

        // Check TXT on org label
        bytes32 orgLh = keccak256(bytes(orgLabel));
        assertEq(resolver.getTxt(orgLh, "weave.roledef.legal-reviewer.name"), "Legal Reviewer");
        assertEq(resolver.getTxt(orgLh, "weave.roledef.legal-reviewer.color"), "#7c3aed");
        assertEq(resolver.getTxt(orgLh, "weave.roledef.legal-reviewer.nybble"), "16");
    }

    function test_defineOrgRole_duplicate_nybble_reverts() public {
        string memory orgLabel = string(abi.encodePacked("dupnybble", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        registrar.defineOrgRole(orgLabel, 16, "role-a", "Role A", "", "#fff");

        vm.prank(address(alice));
        vm.expectRevert(WeaveRoleRegistry.NybbleTaken.selector);
        registrar.defineOrgRole(orgLabel, 16, "role-b", "Role B", "", "#000");
    }

    function test_defineOrgRole_invalid_nybble_reverts() public {
        string memory orgLabel = string(abi.encodePacked("invnybble", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        vm.expectRevert(WeaveRegistrar.InvalidCustomNybble.selector);
        registrar.defineOrgRole(orgLabel, 5, "bad-role", "Bad", "", "#000");
    }

    function test_grantNamedRole_by_slug() public {
        string memory orgLabel = string(abi.encodePacked("namedgrant", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        vm.prank(address(alice));
        registrar.defineOrgRole(
            orgLabel, 16, "legal-reviewer",
            "Legal Reviewer", "Can read contracts", "#7c3aed"
        );

        vm.prank(address(alice));
        registrar.grantNamedRole(orgLabel, "bob", address(bob), "legal-reviewer");

        uint256 bitmap = registrar.getMemberRoles(orgLabel, address(bob));
        uint256 expectedBit = uint256(1) << (16 * 4);
        assertTrue(bitmap & expectedBit != 0, "bob should have legal-reviewer bit");
    }

    function test_revokeNamedRole_by_slug() public {
        string memory orgLabel = string(abi.encodePacked("namedrevoke", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        vm.prank(address(alice));
        registrar.defineOrgRole(orgLabel, 17, "reviewer", "Reviewer", "", "#aaa");

        vm.prank(address(alice));
        registrar.grantNamedRole(orgLabel, "bob", address(bob), "reviewer");

        vm.prank(address(alice));
        registrar.revokeNamedRole(orgLabel, "bob", address(bob), "reviewer");

        uint256 bitmap = registrar.getMemberRoles(orgLabel, address(bob));
        uint256 expectedBit = uint256(1) << (17 * 4);
        assertTrue(bitmap & expectedBit == 0, "bob should not have reviewer bit");
    }

    function test_listOrgRoles_returns_active_roles() public {
        string memory orgLabel = string(abi.encodePacked("listroles", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.startPrank(address(alice));
        registrar.defineOrgRole(orgLabel, 16, "alpha", "Alpha", "", "#f00");
        registrar.defineOrgRole(orgLabel, 17, "beta",  "Beta",  "", "#0f0");
        vm.stopPrank();

        WeaveRoleRegistry.RoleDef[] memory roles = registrar.listOrgRoles(orgLabel);
        assertEq(roles.length, 2);
    }

    // ─── Phase 2: Capability flags ────────────────────────────────────────────

    function test_setMemberCapabilities_writes_txt() public {
        string memory orgLabel = string(abi.encodePacked("caps", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        WeaveRegistrar.MemberCapabilities memory caps = WeaveRegistrar.MemberCapabilities({
            channels:  "general,announcements",
            canInvite: true,
            canExport: false
        });
        vm.prank(address(alice));
        registrar.setMemberCapabilities(orgLabel, "bob", caps);

        bytes32 bobLh = keccak256(bytes(string(abi.encodePacked("bob.", orgLabel))));
        assertEq(resolver.getTxt(bobLh, "weave.channels"),  "general,announcements");
        assertEq(resolver.getTxt(bobLh, "weave.canInvite"), "true");
        assertEq(resolver.getTxt(bobLh, "weave.canExport"), "false");
    }

    // ─── Phase 2: Guest registration with expiry ──────────────────────────────

    function test_registerGuest_sets_expiresAt_txt() public {
        string memory orgLabel = string(abi.encodePacked("guest", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        uint64 duration = 3600; // 1 hour
        vm.prank(address(alice));
        registrar.registerGuest(orgLabel, "tempuser", address(bob), duration, dummyIdentity);

        bytes32 guestLh = keccak256(bytes(string(abi.encodePacked("tempuser.", orgLabel))));
        assertEq(resolver.getTxt(guestLh, "weave.role"), "guest");

        string memory expiresAt = resolver.getTxt(guestLh, "weave.expiresAt");
        assertTrue(bytes(expiresAt).length > 0, "expiresAt should be set");
    }

    function test_resolver_returns_empty_for_expired_guest() public {
        string memory orgLabel = string(abi.encodePacked("expguest", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        uint64 duration = 60; // 60 seconds
        vm.prank(address(alice));
        registrar.registerGuest(orgLabel, "expuser", address(bob), duration, dummyIdentity);

        bytes32 guestLh = keccak256(bytes(string(abi.encodePacked("expuser.", orgLabel))));

        // Before expiry: role should be readable
        assertEq(resolver.getTxt(guestLh, "weave.role"), "guest");

        // Advance time past expiry
        vm.warp(block.timestamp + 120);

        // Build a minimal DNS name: expuser.orgLabel.weave.eth in wire format
        string memory memberLabel = string(abi.encodePacked("expuser.", orgLabel));
        bytes memory dnsName = _buildDnsName(memberLabel);

        // Query text via resolve() — should return empty after expiry
        bytes memory callData = abi.encodeWithSelector(
            bytes4(0x59d1d43c), guestLh, "weave.role"
        );
        bytes memory result = resolver.resolve(dnsName, callData);
        string memory decoded = abi.decode(result, (string));
        assertEq(decoded, "", "expired guest should return empty text");
    }

    // ─── Phase 2: Content hash and coin addr ──────────────────────────────────

    function test_setMemberContentHash_stored_and_resolved() public {
        string memory orgLabel = string(abi.encodePacked("chash", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        bytes memory ipfsHash = hex"e30101701220deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
        vm.prank(address(alice));
        registrar.setMemberContentHash(orgLabel, "bob", ipfsHash);

        bytes32 bobLh = keccak256(bytes(string(abi.encodePacked("bob.", orgLabel))));
        assertEq(resolver.getContentHash(bobLh), ipfsHash);

        // Verify via resolve() — selector 0xbc1c58d1
        bytes memory dnsName = _buildDnsName(string(abi.encodePacked("bob.", orgLabel)));
        bytes memory callData = abi.encodeWithSelector(bytes4(0xbc1c58d1), bobLh);
        bytes memory result = resolver.resolve(dnsName, callData);
        bytes memory decoded = abi.decode(result, (bytes));
        assertEq(decoded, ipfsHash);
    }

    function test_setCoinAddr_stored_and_resolved() public {
        string memory orgLabel = string(abi.encodePacked("coinaddr", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        bytes memory btcAddr = hex"76a914751e76e8199196f454f092f18e21f5a7c9f15a1688ac";
        vm.prank(address(alice));
        registrar.setMemberCoinAddr(orgLabel, "bob", 0, btcAddr); // coinType 0 = BTC

        bytes32 bobLh = keccak256(bytes(string(abi.encodePacked("bob.", orgLabel))));
        assertEq(resolver.getCoinAddr(bobLh, 0), btcAddr);

        // Verify via resolve() — selector 0xf1cb7e06 with coinType=0
        bytes memory dnsName = _buildDnsName(string(abi.encodePacked("bob.", orgLabel)));
        bytes memory callData = abi.encodeWithSelector(bytes4(0xf1cb7e06), bobLh, uint256(0));
        bytes memory result = resolver.resolve(dnsName, callData);
        bytes memory decoded = abi.decode(result, (bytes));
        assertEq(decoded, btcAddr);
    }

    // ─── Phase 3: Sub-admin management and bounded delegation ─────────────────

    function test_addSubAdmin_can_enroll_members() public {
        string memory orgLabel = string(abi.encodePacked("subadmin", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        registrar.addSubAdmin(orgLabel, address(bob));

        // bob (sub-admin) can now enroll
        ERC1155Wallet carol = new ERC1155Wallet();
        vm.prank(address(bob));
        registrar.enrollMember(orgLabel, "carol", address(carol), dummyIdentity);

        bytes32 carolLh = keccak256(bytes(string(abi.encodePacked("carol.", orgLabel))));
        assertEq(resolver.getTxt(carolLh, "weave.role"), "member");
    }

    function test_subAdmin_cannot_grant_roles_not_held() public {
        string memory orgLabel = string(abi.encodePacked("ceiling", vm.toString(block.number)));
        uint256 roleMod = registrar.ROLE_MODERATOR();
        uint256 roleReg = registrar.ROLE_REGISTRAR();
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        // Grant bob only ROLE_MODERATOR
        vm.prank(address(alice));
        registrar.grantOrgRole(orgLabel, "bob", address(bob), roleMod);

        // Make bob a sub-admin
        vm.prank(address(alice));
        registrar.addSubAdmin(orgLabel, address(bob));

        // bob tries to grant ROLE_REGISTRAR (which he doesn't hold) — must revert
        ERC1155Wallet carol = new ERC1155Wallet();
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "carol", address(carol), dummyIdentity);

        vm.prank(address(bob));
        vm.expectRevert(WeaveRegistrar.CannotGrantRolesNotHeld.selector);
        registrar.grantOrgRole(orgLabel, "carol", address(carol), roleReg);
    }

    function test_subAdmin_can_grant_roles_it_holds() public {
        string memory orgLabel = string(abi.encodePacked("subgrant", vm.toString(block.number)));
        uint256 roleMod = registrar.ROLE_MODERATOR();
        uint256 rolePub = registrar.ROLE_PUBLISHER();
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "bob", address(bob), dummyIdentity);

        // Grant bob ROLE_MODERATOR | ROLE_PUBLISHER
        vm.prank(address(alice));
        registrar.grantOrgRole(orgLabel, "bob", address(bob), roleMod | rolePub);

        vm.prank(address(alice));
        registrar.addSubAdmin(orgLabel, address(bob));

        ERC1155Wallet carol = new ERC1155Wallet();
        vm.prank(address(alice));
        registrar.enrollMember(orgLabel, "carol", address(carol), dummyIdentity);

        // bob grants carol only ROLE_PUBLISHER (subset of what bob holds) — should succeed
        vm.prank(address(bob));
        registrar.grantOrgRole(orgLabel, "carol", address(carol), rolePub);

        uint256 carolBitmap = registrar.getMemberRoles(orgLabel, address(carol));
        assertTrue(carolBitmap & rolePub != 0, "carol should have publisher");
    }

    function test_removeSubAdmin_revokes_enrollment_rights() public {
        string memory orgLabel = string(abi.encodePacked("removesub", vm.toString(block.number)));
        registrar.registerOrg(orgLabel, address(alice), dummyIdentity);

        vm.prank(address(alice));
        registrar.addSubAdmin(orgLabel, address(bob));

        vm.prank(address(alice));
        registrar.removeSubAdmin(orgLabel, address(bob));

        ERC1155Wallet carol = new ERC1155Wallet();
        vm.prank(address(bob));
        vm.expectRevert(WeaveRegistrar.NotOrgAdmin.selector);
        registrar.enrollMember(orgLabel, "carol", address(carol), dummyIdentity);
    }

    // ─── Helper: build DNS wire-format name for resolve() ─────────────────────

    function _buildDnsName(string memory subLabel) internal pure returns (bytes memory) {
        // subLabel is e.g. "bob.myorg" — we need wire format for bob.myorg.weave.eth
        bytes memory result;
        // Split subLabel on dots
        bytes memory sub = bytes(subLabel);
        uint256 start = 0;
        for (uint256 i = 0; i <= sub.length; i++) {
            if (i == sub.length || sub[i] == '.') {
                uint256 len = i - start;
                result = abi.encodePacked(result, uint8(len));
                for (uint256 j = start; j < i; j++) result = abi.encodePacked(result, sub[j]);
                start = i + 1;
            }
        }
        // Append .weave.eth
        result = abi.encodePacked(result, uint8(5), "weave", uint8(3), "eth", uint8(0));
        return result;
    }
}

