// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev ENSv2 RegistryRolesLib constants (all values exact from ENSv2 source):
///   ROLE_REGISTRAR       = 1 << 0
///   ROLE_UNREGISTER      = 1 << 12
///   ROLE_RENEW           = 1 << 16
///   ROLE_SET_SUBREGISTRY = 1 << 20
///   ROLE_SET_RESOLVER    = 1 << 24
///   ROLE_CAN_TRANSFER_ADMIN = (1<<28) << 128  (upper 128 bits)
///
/// ERC-1155 lifecycle:
///   - Mint on register()
///   - Burn on unregister() or re-registration after expiry
///   - Burn+remint (same owner) on every grantRoles / revokeRoles call
///   - tokenId = upper 224 bits of labelhash | lower 32 bits tokenVersion
///   - Soulbound = no ROLE_CAN_TRANSFER_ADMIN in roleBitmap
contract WeavePermissionedRegistry {
    // ── Role constants ────────────────────────────────────────────────────────
    uint256 public constant ROLE_REGISTRAR       = 1 << 0;
    uint256 public constant ROLE_UNREGISTER      = 1 << 12;
    uint256 public constant ROLE_RENEW           = 1 << 16;
    uint256 public constant ROLE_SET_SUBREGISTRY = 1 << 20;
    uint256 public constant ROLE_SET_RESOLVER    = 1 << 24;
    uint256 public constant ROLE_CAN_TRANSFER_ADMIN = uint256(1 << 28) << 128;

    // Soulbound member — omits ROLE_CAN_TRANSFER_ADMIN
    uint256 public constant MEMBER_ROLES =
        ROLE_SET_RESOLVER | ROLE_SET_SUBREGISTRY | ROLE_RENEW;

    // Limited guest
    uint256 public constant GUEST_ROLES = ROLE_SET_RESOLVER;

    // Transferable operator
    uint256 public constant OPERATOR_ROLES =
        ROLE_SET_RESOLVER | ROLE_SET_SUBREGISTRY | ROLE_RENEW | ROLE_CAN_TRANSFER_ADMIN;

    // ── Storage ───────────────────────────────────────────────────────────────
    struct SubnameRecord {
        address owner;
        address resolver;
        uint256 roleBitmap;
        uint64  expiry;
        uint32  tokenVersion;
    }

    mapping(bytes32 => SubnameRecord) public records;
    mapping(bytes32 => uint256)       public tokenIds;
    // ERC-1155 balance: tokenId => holder => amount
    mapping(uint256 => mapping(address => uint256)) private _balances;

    mapping(address => bool) public registrars;
    address public owner;
    address public immutable wildcardResolver;

    // ── Events ────────────────────────────────────────────────────────────────
    event SubnameRegistered(bytes32 indexed labelHash, address indexed owner_, uint64 expiry);
    event SubnameUnregistered(bytes32 indexed labelHash);
    event TokenRegenerated(bytes32 indexed labelHash, uint256 oldId, uint256 newId);
    event RegistrarGranted(address indexed account);
    event RegistrarRevoked(address indexed account);

    // ── Errors ────────────────────────────────────────────────────────────────
    error NotOwner();
    error NotRegistrar();
    error AlreadyRegistered();
    error NotRegistered();

    constructor(address _wildcardResolver) {
        owner = msg.sender;
        wildcardResolver = _wildcardResolver;
        registrars[msg.sender] = true;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    modifier onlyRegistrar() {
        if (!registrars[msg.sender] && msg.sender != owner) revert NotRegistrar();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function grantRegistrar(address account) external onlyOwner {
        registrars[account] = true;
        emit RegistrarGranted(account);
    }

    function revokeRegistrar(address account) external onlyOwner {
        registrars[account] = false;
        emit RegistrarRevoked(account);
    }

    // ── Token ID computation ──────────────────────────────────────────────────
    // tokenId = upper 224 bits of labelHash | lower 32 bits = tokenVersion
    function _computeTokenId(bytes32 labelHash, uint32 version) internal pure returns (uint256) {
        return (uint256(labelHash) & ~uint256(type(uint32).max)) | uint256(version);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return _balances[id][account];
    }

    function ownerOf(bytes32 labelHash) external view returns (address) {
        return records[labelHash].owner;
    }

    function tokenId(bytes32 labelHash) external view returns (uint256) {
        return tokenIds[labelHash];
    }

    function recordData(bytes32 labelHash)
        external view
        returns (address _owner, address _resolver, uint256 _roles, uint64 _expiry, uint32 _version)
    {
        SubnameRecord storage r = records[labelHash];
        return (r.owner, r.resolver, r.roleBitmap, r.expiry, r.tokenVersion);
    }

    // ── Registration ──────────────────────────────────────────────────────────
    function registerMember(string calldata label, address _owner) external onlyRegistrar {
        _register(label, _owner, MEMBER_ROLES, type(uint64).max);
    }

    function registerGuest(string calldata label, address _owner, uint64 duration) external onlyRegistrar {
        _register(label, _owner, GUEST_ROLES, uint64(block.timestamp) + duration);
    }

    function registerOperator(string calldata label, address _owner) external onlyRegistrar {
        _register(label, _owner, OPERATOR_ROLES, type(uint64).max);
    }

    function _register(string calldata label, address _owner, uint256 roles, uint64 expiry) internal {
        bytes32 lh = keccak256(bytes(label));
        SubnameRecord storage r = records[lh];

        if (r.owner != address(0)) {
            if (r.expiry >= block.timestamp) revert AlreadyRegistered();
            _burn(r.owner, tokenIds[lh]);
        }

        uint32 version = r.tokenVersion + 1;
        uint256 tid = _computeTokenId(lh, version);

        records[lh] = SubnameRecord({
            owner:        _owner,
            resolver:     wildcardResolver,
            roleBitmap:   roles,
            expiry:       expiry,
            tokenVersion: version
        });
        tokenIds[lh] = tid;
        _mint(_owner, tid);

        emit SubnameRegistered(lh, _owner, expiry);
    }

    function unregisterMember(string calldata label) external onlyRegistrar {
        bytes32 lh = keccak256(bytes(label));
        SubnameRecord storage r = records[lh];
        if (r.owner == address(0)) revert NotRegistered();
        // Prevent forcible burn before expiry regardless of role tier.
        require(r.expiry < block.timestamp, "token not expired");
        _burn(r.owner, tokenIds[lh]);
        delete records[lh];
        delete tokenIds[lh];
        emit SubnameUnregistered(lh);
    }

    // ── Role management (each call regenerates tokenId) ───────────────────────
    function grantRoles(bytes32 labelHash, uint256 additional) external onlyRegistrar {
        SubnameRecord storage r = records[labelHash];
        if (r.owner == address(0)) revert NotRegistered();
        uint256 old = tokenIds[labelHash];
        _burn(r.owner, old);
        r.roleBitmap |= additional;
        r.tokenVersion += 1;
        uint256 newId = _computeTokenId(labelHash, r.tokenVersion);
        tokenIds[labelHash] = newId;
        _mint(r.owner, newId);
        emit TokenRegenerated(labelHash, old, newId);
    }

    function revokeRoles(bytes32 labelHash, uint256 toRemove) external onlyRegistrar {
        SubnameRecord storage r = records[labelHash];
        if (r.owner == address(0)) revert NotRegistered();
        uint256 old = tokenIds[labelHash];
        _burn(r.owner, old);
        r.roleBitmap &= ~toRemove;
        r.tokenVersion += 1;
        uint256 newId = _computeTokenId(labelHash, r.tokenVersion);
        tokenIds[labelHash] = newId;
        _mint(r.owner, newId);
        emit TokenRegenerated(labelHash, old, newId);
    }

    // ── ERC-1155 lite ─────────────────────────────────────────────────────────
    function _mint(address to, uint256 id) internal {
        _balances[id][to] += 1;
    }

    function _burn(address from, uint256 id) internal {
        _balances[id][from] -= 1;
    }
}
