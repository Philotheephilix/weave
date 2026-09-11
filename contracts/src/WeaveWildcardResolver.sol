// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev ENSIP-10 ExtendedResolver — answers all *.weave.eth queries without
///      per-user on-chain registration. One resolver handles the entire namespace.
///      authorizedSetters enforces per-name write access.
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
    // label is the full sub-label under .weave.eth, e.g. "philo.google" for philo.google.weave.eth
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

    function setIdentity(bytes32 labelHash, WeaveIdentity calldata identity) external {
        if (!authorizedSetters[msg.sender] && msg.sender != owner) revert NotAuthorized();
        identities[labelHash] = identity;
        emit IdentitySet(labelHash, msg.sender);
    }

    /// @notice ENSIP-10 resolve(bytes dnsName, bytes data)
    ///         Called by ENSv2 Universal Resolver for *.weave.eth queries.
    ///         dnsName: DNS wire-format — length-prefixed labels, e.g.
    ///           \x05philo\x06google\x05weave\x03eth\x00
    ///         We hash all labels before the ".weave.eth" suffix to produce the
    ///         lookup key, matching how WeaveRegistrar stores them:
    ///           keccak256("philo.google") for philo.google.weave.eth
    function resolve(bytes calldata dnsName, bytes calldata data)
        external view returns (bytes memory)
    {
        bytes32 labelHash = _parseLabelHash(dnsName);
        require(labelHash != bytes32(0), "invalid name");

        WeaveIdentity storage id = identities[labelHash];

        require(data.length >= 4, "no selector");
        bytes4 sel = bytes4(data[:4]);

        // IAddrResolver.addr(bytes32) = 0x3b3b57de  (returns address as bytes32 padded)
        if (sel == 0x3b3b57de) {
            return abi.encode(id.ethAddress);
        }

        // IAddressResolver.addr(bytes32,uint256) = 0xf1cb7e06 (coinType; 60 = ETH)
        if (sel == 0xf1cb7e06) {
            (, uint256 coinType) = abi.decode(data[4:], (bytes32, uint256));
            if (coinType == 60) {
                bytes memory addrBytes = abi.encodePacked(id.ethAddress);
                return abi.encode(addrBytes);
            }
            return abi.encode(bytes(""));
        }

        // ITextResolver.text(bytes32,string) = 0x59d1d43c
        if (sel == 0x59d1d43c) {
            (, string memory key) = abi.decode(data[4:], (bytes32, string));
            return abi.encode(_text(id, key));
        }

        return "";
    }

    /// @dev Parse DNS wire-format name, collecting dot-joined labels before ".weave.eth",
    ///      then return keccak256 of that joined string.
    ///      "philo.google.weave.eth" → keccak256("philo.google")
    ///      "google.weave.eth"       → keccak256("google")
    function _parseLabelHash(bytes calldata dnsName) internal pure returns (bytes32) {
        // Count the total number of labels so we can skip the last 2 (.weave, .eth)
        // by collecting all labels first, then hashing all except the trailing 2.
        bytes[] memory labels = new bytes[](32); // max 32 labels
        uint256 count = 0;
        uint256 i = 0;
        while (i < dnsName.length) {
            uint8 len = uint8(dnsName[i]);
            if (len == 0) break; // root label
            require(count < 32, "name too deep");
            require(i + 1 + len <= dnsName.length, "malformed dnsName");
            labels[count] = dnsName[i + 1 : i + 1 + len];
            count++;
            i += 1 + len;
        }
        // Need at least 3 labels: <sub>.weave.eth (sub can be multi-segment but count > 2)
        if (count <= 2) return bytes32(0);

        // Join all labels except the trailing two (.weave and .eth) with dots
        // e.g. ["philo","google","weave","eth"] → "philo.google"
        uint256 subCount = count - 2;
        uint256 totalLen = 0;
        for (uint256 j = 0; j < subCount; j++) {
            totalLen += labels[j].length;
            if (j < subCount - 1) totalLen += 1; // dot separator
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
