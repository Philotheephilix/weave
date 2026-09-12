// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {WeaveWildcardResolver} from "./WeaveWildcardResolver.sol";
import {WeaveRoleRegistry} from "./WeaveRoleRegistry.sol";

// ── ENSv2 PermissionedRegistry ────────────────────────────────────────────────
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
    function grantRootRoles(uint256 roleBitmap, address account) external;
    function revokeRootRoles(uint256 roleBitmap, address account) external returns (bool);
}

// ── VerifiableFactory ─────────────────────────────────────────────────────────
interface IVerifiableFactory {
    function deployProxy(address implementation, uint256 salt, bytes calldata data)
        external returns (address);
}

/// @notice Front-end for weave.eth subname registration with EAC role management,
///         custom role definitions, capability flags, and bounded delegation.
contract WeaveRegistrar {
    // ── ENSv2 infrastructure (Sepolia) ────────────────────────────────────────
    IVerifiableFactory  public immutable factory;
    address             public immutable registryImpl;
    address             public immutable weaveRegistry;
    WeaveWildcardResolver public immutable resolver;
    WeaveRoleRegistry   public immutable roleRegistry;

    string public constant SALT_NS = "weave.eth/member-registry/v1";

    uint256 public constant ALL_ROLES =
        0x1111111111111111111111111111111111111111111111111111111111111111;
    uint256 public constant ROOT_RESOURCE = 0;
    uint64  public constant PERMANENT = type(uint64).max;

    // ── Built-in role bitmap constants (nybbles 0–7) ──────────────────────────
    uint256 public constant ROLE_REGISTRAR = 0x1;         // nybble 0 — ENSv2 protocol
    uint256 public constant ROLE_MODERATOR = 0x10;        // nybble 1
    uint256 public constant ROLE_PUBLISHER = 0x100;       // nybble 2
    uint256 public constant ROLE_VIEWER    = 0x1000;      // nybble 3
    uint256 public constant ROLE_AUDITOR   = 0x10000;     // nybble 4
    uint256 public constant ROLE_BOT       = 0x100000;    // nybble 5
    uint256 public constant ROLE_GUEST     = 0x1000000;   // nybble 6
    uint256 public constant ROLE_BILLING   = 0x10000000;  // nybble 7

    // Built-in roles mask: nybbles 0–7
    uint256 private constant _BUILTIN_MASK = 0xFFFFFFFF;

    address public owner;

    // orgLabelHash => primary admin address
    mapping(bytes32 => address) public orgAdmins;

    // Phase 3: orgLabelHash => address => is sub-admin
    mapping(bytes32 => mapping(address => bool)) public subAdmins;

    // ── Events ────────────────────────────────────────────────────────────────
    event Registered(string label, address indexed owner, string tier);
    event OrgRegistered(string orgLabel, address indexed admin);
    event MemberEnrolled(string orgLabel, string memberLabel, address indexed memberAddr);
    event RoleGranted(string orgLabel, address indexed member, uint256 roleBitmap);
    event RoleRevoked(string orgLabel, address indexed member, uint256 roleBitmap);
    event CustomRoleDefined(string orgLabel, uint8 nybble, string slug);
    event SubAdminAdded(string orgLabel, address indexed account);
    event SubAdminRemoved(string orgLabel, address indexed account);
    event OwnershipTransferred(address indexed prev, address indexed next);

    // ── Errors ────────────────────────────────────────────────────────────────
    error NotOwner();
    error NotOrgAdmin();
    error NotSubAdmin();
    error OrgNotFound();
    error OrgAlreadyExists();
    error CannotGrantRolesNotHeld();
    error InvalidCustomNybble();

    constructor(
        address _factory,
        address _registryImpl,
        address _weaveRegistry,
        address _resolver
    ) {
        factory       = IVerifiableFactory(_factory);
        registryImpl  = _registryImpl;
        weaveRegistry = _weaveRegistry;
        resolver      = WeaveWildcardResolver(_resolver);
        // Deploy the role registry pointing back to this contract
        roleRegistry  = new WeaveRoleRegistry(address(this));
        owner         = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOrgAdmin(bytes32 orgLh) {
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        if (orgAdmins[orgLh] != msg.sender) revert NotOrgAdmin();
        _;
    }

    modifier onlyOrgAdminOrSub(bytes32 orgLh) {
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        if (orgAdmins[orgLh] != msg.sender && !subAdmins[orgLh][msg.sender]) revert NotOrgAdmin();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ── Clone helpers ─────────────────────────────────────────────────────────

    function _deployClone(string memory label) internal returns (address clone) {
        uint256 s = uint256(keccak256(abi.encodePacked(SALT_NS, "::", label)));
        bytes memory initData = abi.encodeWithSignature(
            "initialize(address,uint256)", address(this), ALL_ROLES
        );
        clone = factory.deployProxy(registryImpl, s, initData);
        require(clone.code.length > 0, "clone deploy failed");
    }

    // ── Org + member registration ─────────────────────────────────────────────

    function registerOrg(
        string calldata orgLabel,
        address adminAddr,
        WeaveWildcardResolver.WeaveIdentity calldata adminIdentity
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] != address(0)) revert OrgAlreadyExists();

        address orgClone = _deployClone(orgLabel);

        IPermissionedRegistry(weaveRegistry).register(
            orgLabel, adminAddr, orgClone, address(resolver), ALL_ROLES, PERMANENT
        );
        resolver.setTxt(orgLh, "weave.role", "org");

        string memory adminLabel = string(abi.encodePacked("admin.", orgLabel));
        bytes32 adminLh = keccak256(bytes(adminLabel));
        address adminClone = _deployClone(adminLabel);
        IPermissionedRegistry(orgClone).register(
            "admin", adminAddr, adminClone, address(resolver), ALL_ROLES, PERMANENT
        );
        resolver.setIdentity(adminLh, adminIdentity);
        resolver.setTxt(adminLh, "weave.role", "admin");
        resolver.setTxt(adminLh, "weave.roles", "admin");
        resolver.setTxt(adminLh, "weave.roleBitmap", "0x1111111111111111111111111111111111111111111111111111111111111111");
        resolver.setTxt(adminLh, "weave.joinedAt", _uint64Str(uint64(block.timestamp)));

        orgAdmins[orgLh] = adminAddr;

        emit OrgRegistered(orgLabel, adminAddr);
        emit Registered(orgLabel, adminAddr, "org");
        emit Registered(adminLabel, adminAddr, "admin");
    }

    function enrollMember(
        string calldata orgLabel,
        string calldata memberLabel,
        address memberAddr,
        WeaveWildcardResolver.WeaveIdentity calldata memberIdentity
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        if (orgAdmins[orgLh] != msg.sender && !subAdmins[orgLh][msg.sender]) revert NotOrgAdmin();

        address orgClone = IPermissionedRegistry(weaveRegistry).getSubregistry(orgLabel);
        require(orgClone != address(0), "org has no registry");

        string memory fullLabel = string(abi.encodePacked(memberLabel, ".", orgLabel));
        bytes32 fullLh = keccak256(bytes(fullLabel));

        address memberClone = _deployClone(fullLabel);
        IPermissionedRegistry(orgClone).register(
            memberLabel, memberAddr, memberClone, address(resolver), ALL_ROLES, PERMANENT
        );
        resolver.setIdentity(fullLh, memberIdentity);
        resolver.setTxt(fullLh, "weave.role", "member");
        resolver.setTxt(fullLh, "weave.roles", "member");
        resolver.setTxt(fullLh, "weave.roleBitmap", "0x0");
        resolver.setTxt(fullLh, "weave.joinedAt", _uint64Str(uint64(block.timestamp)));

        emit MemberEnrolled(orgLabel, memberLabel, memberAddr);
        emit Registered(fullLabel, memberAddr, "member");
    }

    // ── Phase 1: EAC role grant / revoke (bounded for sub-admins) ────────────

    /// @notice Grant EAC roles to a member.
    ///         Primary admin can grant any bitmap. Sub-admins are ceiling-bounded
    ///         to their own roles on the org clone.
    function grantOrgRole(
        string calldata orgLabel,
        string calldata memberLabel,
        address memberAddr,
        uint256 roleBitmap
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        bool isPrimary = (orgAdmins[orgLh] == msg.sender);
        if (!isPrimary && !subAdmins[orgLh][msg.sender]) revert NotOrgAdmin();

        address orgClone = IPermissionedRegistry(weaveRegistry).getSubregistry(orgLabel);
        require(orgClone != address(0), "org has no registry");

        // Ceiling enforcement for sub-admins
        if (!isPrimary) {
            uint256 callerBitmap = IPermissionedRegistry(orgClone).roles(ROOT_RESOURCE, msg.sender);
            if (roleBitmap & ~callerBitmap != 0) revert CannotGrantRolesNotHeld();
        }

        IPermissionedRegistry(orgClone).grantRootRoles(roleBitmap, memberAddr);
        _syncRoleTxt(orgLabel, memberLabel, memberAddr, orgClone, roleBitmap, true);

        emit RoleGranted(orgLabel, memberAddr, roleBitmap);
    }

    function revokeOrgRole(
        string calldata orgLabel,
        string calldata memberLabel,
        address memberAddr,
        uint256 roleBitmap
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        bool isPrimary = (orgAdmins[orgLh] == msg.sender);
        if (!isPrimary && !subAdmins[orgLh][msg.sender]) revert NotOrgAdmin();

        address orgClone = IPermissionedRegistry(weaveRegistry).getSubregistry(orgLabel);
        require(orgClone != address(0), "org has no registry");

        IPermissionedRegistry(orgClone).revokeRootRoles(roleBitmap, memberAddr);
        _syncRoleTxt(orgLabel, memberLabel, memberAddr, orgClone, roleBitmap, false);

        emit RoleRevoked(orgLabel, memberAddr, roleBitmap);
    }

    /// @dev Re-reads the member's bitmap after grant/revoke and syncs TXT records.
    function _syncRoleTxt(
        string calldata orgLabel,
        string calldata memberLabel,
        address memberAddr,
        address orgClone,
        uint256 /*changedBitmap*/,
        bool /*isGrant*/
    ) internal {
        bytes32 fullLh = keccak256(bytes(string(abi.encodePacked(memberLabel, ".", orgLabel))));
        uint256 newBitmap = IPermissionedRegistry(orgClone).roles(ROOT_RESOURCE, memberAddr);

        resolver.setTxt(fullLh, "weave.roleBitmap", _hexBitmap(newBitmap));

        // Primary role string: highest-privilege named role in bitmap
        string memory primaryRole = _primaryRoleSlug(newBitmap);
        resolver.setTxt(fullLh, "weave.role", primaryRole);

        // weave.roles: comma-separated list of all held named roles
        resolver.setTxt(fullLh, "weave.roles", _rolesList(newBitmap));
    }

    /// @dev Returns the highest-privilege named role slug for a bitmap.
    function _primaryRoleSlug(uint256 bitmap) internal pure returns (string memory) {
        if (bitmap & ROLE_REGISTRAR != 0) return "admin";
        if (bitmap & ROLE_MODERATOR  != 0) return "moderator";
        if (bitmap & ROLE_PUBLISHER  != 0) return "publisher";
        if (bitmap & ROLE_AUDITOR    != 0) return "auditor";
        if (bitmap & ROLE_VIEWER     != 0) return "viewer";
        if (bitmap & ROLE_BOT        != 0) return "bot";
        if (bitmap & ROLE_GUEST      != 0) return "guest";
        if (bitmap & ROLE_BILLING    != 0) return "billing";
        return "member";
    }

    /// @dev Returns comma-separated list of all held named role slugs.
    function _rolesList(uint256 bitmap) internal pure returns (string memory) {
        bytes memory buf;
        if (bitmap & ROLE_REGISTRAR != 0) buf = _appendRole(buf, "admin");
        if (bitmap & ROLE_MODERATOR  != 0) buf = _appendRole(buf, "moderator");
        if (bitmap & ROLE_PUBLISHER  != 0) buf = _appendRole(buf, "publisher");
        if (bitmap & ROLE_AUDITOR    != 0) buf = _appendRole(buf, "auditor");
        if (bitmap & ROLE_VIEWER     != 0) buf = _appendRole(buf, "viewer");
        if (bitmap & ROLE_BOT        != 0) buf = _appendRole(buf, "bot");
        if (bitmap & ROLE_GUEST      != 0) buf = _appendRole(buf, "guest");
        if (bitmap & ROLE_BILLING    != 0) buf = _appendRole(buf, "billing");
        if (buf.length == 0) return "member";
        return string(buf);
    }

    function _appendRole(bytes memory buf, string memory role) internal pure returns (bytes memory) {
        if (buf.length > 0) buf = abi.encodePacked(buf, ",");
        return abi.encodePacked(buf, role);
    }

    // ── Phase 1: Named role grant / revoke via WeaveRoleRegistry ─────────────

    function grantNamedRole(
        string calldata orgLabel,
        string calldata memberLabel,
        address memberAddr,
        string calldata slug
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        bool isPrimary = (orgAdmins[orgLh] == msg.sender);
        if (!isPrimary && !subAdmins[orgLh][msg.sender]) revert NotOrgAdmin();

        WeaveRoleRegistry.RoleDef memory rd = roleRegistry.getRoleBySlug(orgLh, slug);
        require(rd.active, "role not defined");

        address orgClone = IPermissionedRegistry(weaveRegistry).getSubregistry(orgLabel);
        require(orgClone != address(0), "org has no registry");

        if (!isPrimary) {
            uint256 callerBitmap = IPermissionedRegistry(orgClone).roles(ROOT_RESOURCE, msg.sender);
            if (rd.bitmap & ~callerBitmap != 0) revert CannotGrantRolesNotHeld();
        }

        IPermissionedRegistry(orgClone).grantRootRoles(rd.bitmap, memberAddr);
        _syncRoleTxt(orgLabel, memberLabel, memberAddr, orgClone, rd.bitmap, true);

        emit RoleGranted(orgLabel, memberAddr, rd.bitmap);
    }

    function revokeNamedRole(
        string calldata orgLabel,
        string calldata memberLabel,
        address memberAddr,
        string calldata slug
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        bool isPrimary = (orgAdmins[orgLh] == msg.sender);
        if (!isPrimary && !subAdmins[orgLh][msg.sender]) revert NotOrgAdmin();

        WeaveRoleRegistry.RoleDef memory rd = roleRegistry.getRoleBySlug(orgLh, slug);
        require(rd.active, "role not defined");

        address orgClone = IPermissionedRegistry(weaveRegistry).getSubregistry(orgLabel);
        require(orgClone != address(0), "org has no registry");

        IPermissionedRegistry(orgClone).revokeRootRoles(rd.bitmap, memberAddr);
        _syncRoleTxt(orgLabel, memberLabel, memberAddr, orgClone, rd.bitmap, false);

        emit RoleRevoked(orgLabel, memberAddr, rd.bitmap);
    }

    // ── Phase 1: Define a custom org role ─────────────────────────────────────

    function defineOrgRole(
        string calldata orgLabel,
        uint8 nybble,
        string calldata slug,
        string calldata displayName,
        string calldata description,
        string calldata color
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] != msg.sender) revert NotOrgAdmin();
        if (nybble < 16 || nybble > 63) revert InvalidCustomNybble();

        uint256 bitmap = uint256(0x1) << (nybble * 4);
        roleRegistry.defineRole(orgLh, nybble, slug, displayName, description, color, bitmap);
        _writeRoleDefTxt(orgLh, slug, displayName, description, color, bitmap, nybble);

        emit CustomRoleDefined(orgLabel, nybble, slug);
    }

    function _writeRoleDefTxt(
        bytes32 orgLh,
        string calldata slug,
        string calldata displayName,
        string calldata description,
        string calldata color,
        uint256 bitmap,
        uint8 nybble
    ) internal {
        string memory prefix = string(abi.encodePacked("weave.roledef.", slug));
        resolver.setTxt(orgLh, string(abi.encodePacked(prefix, ".name")),   displayName);
        resolver.setTxt(orgLh, string(abi.encodePacked(prefix, ".desc")),   description);
        resolver.setTxt(orgLh, string(abi.encodePacked(prefix, ".color")),  color);
        resolver.setTxt(orgLh, string(abi.encodePacked(prefix, ".bitmap")), _hexBitmap(bitmap));
        resolver.setTxt(orgLh, string(abi.encodePacked(prefix, ".nybble")), _uint64Str(nybble));
    }

    // ── Phase 2: Capability flags ─────────────────────────────────────────────

    struct MemberCapabilities {
        string channels;    // comma-separated channel slugs (empty = all)
        bool canInvite;
        bool canExport;
    }

    function setMemberCapabilities(
        string calldata orgLabel,
        string calldata memberLabel,
        MemberCapabilities calldata caps
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        if (orgAdmins[orgLh] != msg.sender && !subAdmins[orgLh][msg.sender]) revert NotOrgAdmin();

        bytes32 fullLh = keccak256(bytes(string(abi.encodePacked(memberLabel, ".", orgLabel))));
        resolver.setTxt(fullLh, "weave.channels",  caps.channels);
        resolver.setTxt(fullLh, "weave.canInvite", caps.canInvite ? "true" : "false");
        resolver.setTxt(fullLh, "weave.canExport", caps.canExport ? "true" : "false");
    }

    // ── Phase 2: Time-bounded guest registration ──────────────────────────────

    function registerGuest(
        string calldata orgLabel,
        string calldata memberLabel,
        address memberAddr,
        uint64 durationSeconds,
        WeaveWildcardResolver.WeaveIdentity calldata guestIdentity
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        if (orgAdmins[orgLh] != msg.sender && !subAdmins[orgLh][msg.sender]) revert NotOrgAdmin();

        address orgClone = IPermissionedRegistry(weaveRegistry).getSubregistry(orgLabel);
        require(orgClone != address(0), "org has no registry");

        string memory fullLabel = string(abi.encodePacked(memberLabel, ".", orgLabel));
        bytes32 fullLh = keccak256(bytes(fullLabel));

        address guestClone = _deployClone(fullLabel);
        IPermissionedRegistry(orgClone).register(
            memberLabel, memberAddr, guestClone, address(resolver), ROLE_GUEST, PERMANENT
        );
        resolver.setIdentity(fullLh, guestIdentity);
        resolver.setTxt(fullLh, "weave.role", "guest");
        resolver.setTxt(fullLh, "weave.roles", "guest");
        resolver.setTxt(fullLh, "weave.roleBitmap", _hexBitmap(ROLE_GUEST));
        resolver.setTxt(fullLh, "weave.joinedAt", _uint64Str(uint64(block.timestamp)));
        resolver.setTxt(fullLh, "weave.expiresAt",
            _uint64Str(uint64(block.timestamp) + durationSeconds));

        // Grant ROLE_GUEST bitmap on the org clone
        IPermissionedRegistry(orgClone).grantRootRoles(ROLE_GUEST, memberAddr);

        emit MemberEnrolled(orgLabel, memberLabel, memberAddr);
        emit Registered(fullLabel, memberAddr, "guest");
    }

    // ── Phase 2: Content hash and coin addr pass-through ──────────────────────

    function setMemberContentHash(
        string calldata orgLabel,
        string calldata memberLabel,
        bytes calldata hash
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        if (orgAdmins[orgLh] != msg.sender && !subAdmins[orgLh][msg.sender]) revert NotOrgAdmin();
        bytes32 fullLh = keccak256(bytes(string(abi.encodePacked(memberLabel, ".", orgLabel))));
        resolver.setContentHash(fullLh, hash);
    }

    function setMemberCoinAddr(
        string calldata orgLabel,
        string calldata memberLabel,
        uint256 coinType,
        bytes calldata addr
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        if (orgAdmins[orgLh] != msg.sender && !subAdmins[orgLh][msg.sender]) revert NotOrgAdmin();
        bytes32 fullLh = keccak256(bytes(string(abi.encodePacked(memberLabel, ".", orgLabel))));
        resolver.setCoinAddr(fullLh, coinType, addr);
    }

    // ── Phase 3: Sub-admin management ────────────────────────────────────────

    function addSubAdmin(string calldata orgLabel, address account) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] != msg.sender) revert NotOrgAdmin();
        subAdmins[orgLh][account] = true;
        emit SubAdminAdded(orgLabel, account);
    }

    function removeSubAdmin(string calldata orgLabel, address account) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] != msg.sender) revert NotOrgAdmin();
        subAdmins[orgLh][account] = false;
        emit SubAdminRemoved(orgLabel, account);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    function getMemberRoles(string calldata orgLabel, address memberAddr)
        external view returns (uint256)
    {
        address orgClone = IPermissionedRegistry(weaveRegistry).getSubregistry(orgLabel);
        if (orgClone == address(0)) return 0;
        return IPermissionedRegistry(orgClone).roles(ROOT_RESOURCE, memberAddr);
    }

    function listOrgRoles(string calldata orgLabel)
        external view returns (WeaveRoleRegistry.RoleDef[] memory)
    {
        return roleRegistry.listOrgRoles(keccak256(bytes(orgLabel)));
    }

    // ── Transfer org admin (escape hatch) ─────────────────────────────────────

    function transferOrgAdmin(string calldata orgLabel, address newAdmin) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        if (orgAdmins[orgLh] != msg.sender && msg.sender != owner) revert NotOrgAdmin();
        orgAdmins[orgLh] = newAdmin;
        emit OrgRegistered(orgLabel, newAdmin);
    }

    // ── Owner-only registration helpers ──────────────────────────────────────

    function registerMember(
        string calldata label,
        address tokenOwner,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external onlyOwner {
        bytes32 lh = keccak256(bytes(label));
        address memberClone = _deployClone(label);
        IPermissionedRegistry(weaveRegistry).register(
            label, tokenOwner, memberClone, address(resolver), ALL_ROLES, PERMANENT
        );
        resolver.setIdentity(lh, identity);
        emit Registered(label, tokenOwner, "member");
    }

    function registerOperator(
        string calldata label,
        address tokenOwner,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external onlyOwner {
        bytes32 lh = keccak256(bytes(label));
        address opClone = _deployClone(label);
        IPermissionedRegistry(weaveRegistry).register(
            label, tokenOwner, opClone, address(resolver), ALL_ROLES, PERMANENT
        );
        resolver.setIdentity(lh, identity);
        emit Registered(label, tokenOwner, "operator");
    }

    function forceUnregister(string calldata label) external onlyOwner {
        resolver.clearIdentity(keccak256(bytes(label)));
    }

    function updateIdentity(
        string calldata label,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external {
        bytes32 lh = keccak256(bytes(label));
        address labelOwner = IPermissionedRegistry(weaveRegistry).findOwner(label);
        require(labelOwner == msg.sender || msg.sender == owner, "Not owner");
        uint64 expiry = IPermissionedRegistry(weaveRegistry).findExpiry(label);
        require(expiry == 0 || expiry >= block.timestamp, "Registration expired");
        resolver.setIdentity(lh, identity);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _uint64Str(uint64 n) internal pure returns (string memory) {
        if (n == 0) return "0";
        uint256 tmp = n;
        uint256 len;
        while (tmp != 0) { len++; tmp /= 10; }
        bytes memory buf = new bytes(len);
        tmp = n;
        for (uint256 i = len; i > 0; i--) {
            buf[i - 1] = bytes1(uint8(48 + (tmp % 10)));
            tmp /= 10;
        }
        return string(buf);
    }

    function _hexBitmap(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0x0";
        bytes memory h = "0123456789abcdef";
        bytes memory tmp = new bytes(64);
        uint256 len = 0;
        uint256 n = v;
        while (n != 0) {
            tmp[63 - len] = h[n & 0xf];
            n >>= 4;
            len++;
        }
        bytes memory out = new bytes(2 + len);
        out[0] = "0"; out[1] = "x";
        for (uint256 i = 0; i < len; i++) out[2 + i] = tmp[64 - len + i];
        return string(out);
    }
}
