// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev ENSIP-10 ExtendedResolver — answers all *.weave.eth queries without
///      per-user on-chain registration. One resolver handles the entire namespace.
///
///      ENSv2 PermissionedResolver roles used:
///        ROLE_SET_TEXT = 1 << 4 = 0x10
///      authorizedSetters maps enforces per-name write access (full EAC wired in Phase 2).
contract WeaveWildcardResolver {
    struct WeaveIdentity {
        bytes  stealthViewKey;   // secp256k1 compressed 33 bytes — ERC-5564 viewing key
        bytes  stealthSpendKey;  // secp256k1 compressed 33 bytes — ERC-5564 spend key
        bytes  x25519Pubkey;     // 32 bytes — Noise_XX static DH key
        bytes  onionAddress;     // Tor v3 hostname (56 base32 chars as UTF-8)
        bytes  nostrPubkey;      // 32 bytes — NIP-01 schnorr pubkey
        uint64 registeredAt;
    }

    // keccak256(label) => identity
    mapping(bytes32 => WeaveIdentity) public identities;
    // authorized to call setIdentity (WeaveRegistrar gets this role)
    mapping(address => bool) public authorizedSetters;

    address public owner;

    event IdentitySet(bytes32 indexed labelHash, address indexed setter);
    event OwnershipTransferred(address indexed prev, address indexed next);

    error NotOwner();
    error NotAuthorized();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function authorizeSetterRole(address account, bool grant) external onlyOwner {
        authorizedSetters[account] = grant;
    }

    function clearIdentity(bytes32 labelHash) external {
        if (!authorizedSetters[msg.sender] && msg.sender != owner) revert NotAuthorized();
        delete identities[labelHash];
    }

    /// @notice ENSv2 PermissionedResolver pattern: ROLE_SET_TEXT check
    function setIdentity(bytes32 labelHash, WeaveIdentity calldata identity) external {
        if (!authorizedSetters[msg.sender] && msg.sender != owner) revert NotAuthorized();
        identities[labelHash] = identity;
        emit IdentitySet(labelHash, msg.sender);
    }

    /// @notice ENSIP-10 resolve(bytes dnsName, bytes data)
    ///         Called by ENSv2 Universal Resolver for *.weave.eth queries.
    ///         dnsName: DNS wire-format — first byte is label length, then label bytes.
    function resolve(bytes calldata dnsName, bytes calldata data)
        external view returns (bytes memory)
    {
        require(dnsName.length > 1, "empty name");
        uint8 labelLen = uint8(dnsName[0]);
        require(labelLen > 0, "empty label");
        require(dnsName.length >= 1 + labelLen, "malformed dnsName");
        bytes32 labelHash = keccak256(dnsName[1:1 + labelLen]);

        WeaveIdentity storage id = identities[labelHash];

        require(data.length >= 4, "no selector");
        bytes4 sel = bytes4(data[:4]);

        // ITextResolver.text(bytes32,string) = 0x59d1d43c
        if (sel == 0x59d1d43c) {
            (, string memory key) = abi.decode(data[4:], (bytes32, string));
            return abi.encode(_text(id, key));
        }

        return "";
    }

    function _text(WeaveIdentity storage id, string memory key)
        internal view returns (string memory)
    {
        bytes32 k = keccak256(bytes(key));
        if (k == keccak256("crypto.stealth.view"))  return _hex(id.stealthViewKey);
        if (k == keccak256("crypto.stealth.spend")) return _hex(id.stealthSpendKey);
        if (k == keccak256("crypto.x25519"))        return _hex(id.x25519Pubkey);
        if (k == keccak256("network.onion.v3"))     return string(id.onionAddress);
        if (k == keccak256("social.nostr.pubkey"))  return _hex(id.nostrPubkey);
        return "";
    }

    function _hex(bytes memory d) internal pure returns (string memory) {
        bytes memory h = "0123456789abcdef";
        bytes memory r = new bytes(2 + d.length * 2);
        r[0] = "0"; r[1] = "x";
        for (uint i = 0; i < d.length; i++) {
            r[2 + i*2] = h[uint8(d[i]) >> 4];
            r[3 + i*2] = h[uint8(d[i]) & 0x0f];
        }
        return string(r);
    }

    /// @notice ENSIP-10 supportsInterface
    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x9061b923 // IExtendedResolver
            || id == 0x01ffc9a7; // IERC165
    }
}
