// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev ENSIP-10 ExtendedResolver — answers all *.weave.eth queries without
///      per-user on-chain registration. One resolver handles the entire namespace.
///      authorizedSetters enforces per-name write access.
///
///      Phase 2 additions:
///        - Multi-coin addr(node, coinType) per ENSIP-9 (selector 0xf1cb7e06)
///        - contenthash(node) per ENSIP-7 (selector 0xbc1c58d1)
///        - setContentHash / setCoinAddr with setter auth
///        - Expiry-aware resolve: if weave.expiresAt TXT is set and past, returns
///          empty for addr and text queries (guest token expiry)
contract WeaveWildcardResolver {
    struct WeaveIdentity {
        bytes  stealthViewKey;   // secp256k1 compressed 33 bytes — ERC-5564 viewing key
        bytes  stealthSpendKey;  // secp256k1 compressed 33 bytes — ERC-5564 spend key
        bytes  x25519Pubkey;     // 32 bytes — Noise_XX static DH key
        bytes  onionAddress;     // Tor v3 hostname (56 base32 chars as UTF-8)
        bytes  nostrPubkey;      // 32 bytes — NIP-01 schnorr pubkey
        address ethAddress;      // Ethereum address of the registered member
        string  displayName;     // human-readable display name
        string  avatarUrl;       // URL or data URI for avatar image
        uint64 registeredAt;
    }

    // keccak256(label) => identity
    mapping(bytes32 => WeaveIdentity) public identities;

    // labelHash => key => value — arbitrary TXT records
    mapping(bytes32 => mapping(bytes32 => string)) private _txt;

    // ENSIP-9: labelHash => coinType => coin address bytes
    mapping(bytes32 => mapping(uint256 => bytes)) private _coinAddr;

    // ENSIP-7: labelHash => contenthash bytes
    mapping(bytes32 => bytes) private _contentHash;

    // authorized to call setIdentity / setTxt / setCoinAddr / setContentHash
    mapping(address => bool) public authorizedSetters;

    address public owner;

    // keccak of "weave.expiresAt" — cached for gas efficiency in resolve()
    bytes32 private constant _EXPIRES_AT_KEY = keccak256("weave.expiresAt");

    event IdentitySet(bytes32 indexed labelHash, address indexed setter);
    event TxtSet(bytes32 indexed labelHash, string key, address indexed setter);
    event CoinAddrSet(bytes32 indexed labelHash, uint256 coinType, address indexed setter);
    event ContentHashSet(bytes32 indexed labelHash, address indexed setter);
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

    modifier onlyAuthorized() {
        if (!authorizedSetters[msg.sender] && msg.sender != owner) revert NotAuthorized();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function authorizeSetterRole(address account, bool grant) external onlyOwner {
        authorizedSetters[account] = grant;
    }

    function clearIdentity(bytes32 labelHash) external onlyAuthorized {
        delete identities[labelHash];
    }

    function setIdentity(bytes32 labelHash, WeaveIdentity calldata identity) external onlyAuthorized {
        identities[labelHash] = identity;
        emit IdentitySet(labelHash, msg.sender);
    }

    function setTxt(bytes32 labelHash, string calldata key, string calldata value) external onlyAuthorized {
        _txt[labelHash][keccak256(bytes(key))] = value;
        emit TxtSet(labelHash, key, msg.sender);
    }

    function getTxt(bytes32 labelHash, string calldata key) external view returns (string memory) {
        return _txt[labelHash][keccak256(bytes(key))];
    }

    /// @notice Set a coin address for a name (ENSIP-9). coinType 60 = ETH.
    function setCoinAddr(bytes32 labelHash, uint256 coinType, bytes calldata addr) external onlyAuthorized {
        _coinAddr[labelHash][coinType] = addr;
        emit CoinAddrSet(labelHash, coinType, msg.sender);
    }

    function getCoinAddr(bytes32 labelHash, uint256 coinType) external view returns (bytes memory) {
        return _coinAddr[labelHash][coinType];
    }

    /// @notice Set a content hash for a name (ENSIP-7). Encoded per EIP-1577.
    function setContentHash(bytes32 labelHash, bytes calldata hash) external onlyAuthorized {
        _contentHash[labelHash] = hash;
        emit ContentHashSet(labelHash, msg.sender);
    }

    function getContentHash(bytes32 labelHash) external view returns (bytes memory) {
        return _contentHash[labelHash];
    }

    /// @notice ENSIP-10 resolve(bytes dnsName, bytes data)
    function resolve(bytes calldata dnsName, bytes calldata data)
        external view returns (bytes memory)
    {
        bytes32 labelHash = _parseLabelHash(dnsName);
        require(labelHash != bytes32(0), "invalid name");

        // Expiry check — if weave.expiresAt is set and in the past, return empty
        string storage expiresAtStr = _txt[labelHash][_EXPIRES_AT_KEY];
        if (bytes(expiresAtStr).length > 0) {
            uint64 expiresAt = _parseUint64(expiresAtStr);
            if (expiresAt != 0 && block.timestamp > expiresAt) {
                return abi.encode("");
            }
        }

        WeaveIdentity storage id = identities[labelHash];

        require(data.length >= 4, "no selector");
        bytes4 sel = bytes4(data[:4]);

        // IAddrResolver.addr(bytes32) = 0x3b3b57de
        if (sel == 0x3b3b57de) {
            // Check explicit ETH coin addr first
            bytes storage explicit = _coinAddr[labelHash][60];
            if (explicit.length > 0 && explicit.length == 20) {
                address a;
                bytes memory b = explicit;
                assembly { a := mload(add(b, 20)) }
                return abi.encode(a);
            }
            return abi.encode(id.ethAddress);
        }

        // IAddressResolver.addr(bytes32,uint256) = 0xf1cb7e06 (ENSIP-9 multi-coin)
        if (sel == 0xf1cb7e06) {
            (, uint256 coinType) = abi.decode(data[4:], (bytes32, uint256));
            bytes storage stored = _coinAddr[labelHash][coinType];
            if (stored.length > 0) return abi.encode(stored);
            // Fallback: coinType 60 = ETH identity address
            if (coinType == 60) {
                return abi.encode(abi.encodePacked(id.ethAddress));
            }
            return abi.encode(bytes(""));
        }

        // ITextResolver.text(bytes32,string) = 0x59d1d43c
        if (sel == 0x59d1d43c) {
            (, string memory key) = abi.decode(data[4:], (bytes32, string));
            return abi.encode(_textWithTxt(labelHash, id, key));
        }

        // IContentHashResolver.contenthash(bytes32) = 0xbc1c58d1 (ENSIP-7)
        if (sel == 0xbc1c58d1) {
            return abi.encode(_contentHash[labelHash]);
        }

        return "";
    }

    function _parseLabelHash(bytes calldata dnsName) internal pure returns (bytes32) {
        bytes[] memory labels = new bytes[](32);
        uint256 count = 0;
        uint256 i = 0;
        while (i < dnsName.length) {
            uint8 len = uint8(dnsName[i]);
            if (len == 0) break;
            require(count < 32, "name too deep");
            require(i + 1 + len <= dnsName.length, "malformed dnsName");
            labels[count] = dnsName[i + 1 : i + 1 + len];
            count++;
            i += 1 + len;
        }
        if (count <= 2) return bytes32(0);

        uint256 subCount = count - 2;
        uint256 totalLen = 0;
        for (uint256 j = 0; j < subCount; j++) {
            totalLen += labels[j].length;
            if (j < subCount - 1) totalLen += 1;
        }
        bytes memory joined = new bytes(totalLen);
        uint256 pos = 0;
        for (uint256 j = 0; j < subCount; j++) {
            for (uint256 k = 0; k < labels[j].length; k++) {
                joined[pos++] = labels[j][k];
            }
            if (j < subCount - 1) joined[pos++] = '.';
        }
        return keccak256(joined);
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
        if (k == keccak256("name"))                 return id.displayName;
        if (k == keccak256("avatar"))               return id.avatarUrl;
        if (k == keccak256("eth.address"))          return _addrHex(id.ethAddress);
        return "";
    }

    function _textWithTxt(bytes32 labelHash, WeaveIdentity storage id, string memory key)
        internal view returns (string memory)
    {
        bytes32 k = keccak256(bytes(key));
        string storage stored = _txt[labelHash][k];
        if (bytes(stored).length > 0) return stored;
        return _text(id, key);
    }

    /// @dev Parse a decimal uint64 string. Returns 0 on empty/malformed input.
    function _parseUint64(string storage s) internal view returns (uint64) {
        bytes storage b = bytes(s);
        if (b.length == 0) return 0;
        uint64 val = 0;
        for (uint256 i = 0; i < b.length; i++) {
            uint8 digit = uint8(b[i]);
            if (digit < 48 || digit > 57) return 0;
            val = val * 10 + uint64(digit - 48);
        }
        return val;
    }

    function _hex(bytes memory d) internal pure returns (string memory) {
        bytes memory h = "0123456789abcdef";
        bytes memory r = new bytes(2 + d.length * 2);
        r[0] = "0"; r[1] = "x";
        for (uint256 i = 0; i < d.length; i++) {
            r[2 + i*2] = h[uint8(d[i]) >> 4];
            r[3 + i*2] = h[uint8(d[i]) & 0x0f];
        }
        return string(r);
    }

    function _addrHex(address a) internal pure returns (string memory) {
        return _hex(abi.encodePacked(a));
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x9061b923 // IExtendedResolver
            || id == 0x01ffc9a7; // IERC165
    }
}
