// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @notice On-chain registry for org-defined custom role definitions.
///         Built-in Weave roles occupy nybbles 0-7; nybbles 8-15 are reserved.
///         Org admins may define custom roles in nybbles 16-63 (48 slots).
///
///         Role *definitions* live here (name, bitmap, nybble).
///         Role *assignments* live in the EAC bitmaps on each org's
///         PermissionedRegistry clone, with TXT shadows in the resolver.
contract WeaveRoleRegistry {
    // ── Built-in nybble constants (informational; enforced in WeaveRegistrar) ──
    // nybble 0:  ROLE_REGISTRAR  = 0x1         (ENSv2 protocol)
    // nybble 1:  ROLE_MODERATOR  = 0x10
    // nybble 2:  ROLE_PUBLISHER  = 0x100
    // nybble 3:  ROLE_VIEWER     = 0x1000
    // nybble 4:  ROLE_AUDITOR    = 0x10000
    // nybble 5:  ROLE_BOT        = 0x100000
    // nybble 6:  ROLE_GUEST      = 0x1000000
    // nybble 7:  ROLE_BILLING    = 0x10000000
    // nybbles 8-15: reserved for future Weave protocol roles
    uint8 public constant CUSTOM_NYBBLE_MIN = 16;
    uint8 public constant CUSTOM_NYBBLE_MAX = 63;

    struct RoleDef {
        string  slug;
        string  displayName;
        string  description;
        string  color;       // hex color for badge, e.g. "#7c3aed"
        uint256 bitmap;      // EAC bitmap this role grants
        uint8   nybble;      // 16–63
        bool    active;
    }

    // orgLabelHash => nybble => RoleDef
    mapping(bytes32 => mapping(uint8 => RoleDef)) private _orgRoles;

    // orgLabelHash => keccak256(slug) => nybble (reverse lookup; 0 = unset)
    mapping(bytes32 => mapping(bytes32 => uint8)) private _slugToNybble;

    // Only WeaveRegistrar can write (set in constructor)
    address public immutable registrar;

    event RoleDefined(bytes32 indexed orgLh, uint8 nybble, string slug, uint256 bitmap);
    event RoleUpdated(bytes32 indexed orgLh, uint8 nybble, string slug);
    event RoleDeactivated(bytes32 indexed orgLh, uint8 nybble, string slug);

    error NotRegistrar();
    error InvalidNybble();
    error NybbleTaken();
    error SlugTaken();
    error RoleNotFound();

    constructor(address _registrar) {
        registrar = _registrar;
    }

    modifier onlyRegistrar() {
        if (msg.sender != registrar) revert NotRegistrar();
        _;
    }

    /// @notice Define a new custom role for an org.
    function defineRole(
        bytes32 orgLh,
        uint8   nybble,
        string calldata slug,
        string calldata displayName,
        string calldata description,
        string calldata color,
        uint256 bitmap
    ) external onlyRegistrar {
        if (nybble < CUSTOM_NYBBLE_MIN || nybble > CUSTOM_NYBBLE_MAX) revert InvalidNybble();
        if (_orgRoles[orgLh][nybble].active) revert NybbleTaken();
        bytes32 slugKey = keccak256(bytes(slug));
        if (_slugToNybble[orgLh][slugKey] != 0) revert SlugTaken();

        _orgRoles[orgLh][nybble] = RoleDef({
            slug:        slug,
            displayName: displayName,
            description: description,
            color:       color,
            bitmap:      bitmap,
            nybble:      nybble,
            active:      true
        });
        _slugToNybble[orgLh][slugKey] = nybble;

        emit RoleDefined(orgLh, nybble, slug, bitmap);
    }

    /// @notice Update metadata of an existing custom role (bitmap and nybble cannot change).
    function updateRole(
        bytes32 orgLh,
        uint8   nybble,
        string calldata displayName,
        string calldata description,
        string calldata color
    ) external onlyRegistrar {
        RoleDef storage r = _orgRoles[orgLh][nybble];
        if (!r.active) revert RoleNotFound();
        r.displayName = displayName;
        r.description = description;
        r.color       = color;
        emit RoleUpdated(orgLh, nybble, r.slug);
    }

    /// @notice Deactivate a role (does not remove existing grants; just hides the definition).
    function deactivateRole(bytes32 orgLh, uint8 nybble) external onlyRegistrar {
        RoleDef storage r = _orgRoles[orgLh][nybble];
        if (!r.active) revert RoleNotFound();
        string memory slug = r.slug;
        r.active = false;
        _slugToNybble[orgLh][keccak256(bytes(slug))] = 0;
        emit RoleDeactivated(orgLh, nybble, slug);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getRole(bytes32 orgLh, uint8 nybble) external view returns (RoleDef memory) {
        return _orgRoles[orgLh][nybble];
    }

    function getRoleBySlug(bytes32 orgLh, string calldata slug)
        external view returns (RoleDef memory)
    {
        uint8 nybble = _slugToNybble[orgLh][keccak256(bytes(slug))];
        return _orgRoles[orgLh][nybble];
    }

    function getNybbleForSlug(bytes32 orgLh, string calldata slug) external view returns (uint8) {
        return _slugToNybble[orgLh][keccak256(bytes(slug))];
    }

    /// @notice Return up to 48 active role definitions for an org (nybbles 16-63).
    function listOrgRoles(bytes32 orgLh) external view returns (RoleDef[] memory) {
        uint256 count = 0;
        for (uint8 n = CUSTOM_NYBBLE_MIN; n <= CUSTOM_NYBBLE_MAX; n++) {
            if (_orgRoles[orgLh][n].active) count++;
        }
        RoleDef[] memory out = new RoleDef[](count);
        uint256 idx = 0;
        for (uint8 n = CUSTOM_NYBBLE_MIN; n <= CUSTOM_NYBBLE_MAX; n++) {
            if (_orgRoles[orgLh][n].active) out[idx++] = _orgRoles[orgLh][n];
        }
        return out;
    }
}
