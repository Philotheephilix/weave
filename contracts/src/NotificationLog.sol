// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev Receives CRE Confidential Workflow output: matched ERC-5564 announcement IDs.
///      CRE DON calls onReport(metadata, report) via the KeystoneForwarder.
///      Weave client polls getMatches(sha256(spendPub_compressed_33_bytes)) to detect incoming calls.
///
///      Ethereum Sepolia KeystoneForwarder: 0xF8344CFd5c43616a4366C34E3EEE75af79a74482
contract NotificationLog {
    mapping(bytes32 => string[]) private _matches;

    // KeystoneForwarder address on Sepolia — set in constructor, updatable by owner.
    address public keystoneForwarder;
    address public owner;

    event MatchAdded(bytes32 indexed userPubkeyHash, string announcementId);
    event ForwarderUpdated(address indexed newForwarder);

    error NotForwarder();
    error NotOwner();
    error InvalidReport();

    constructor(address _keystoneForwarder) {
        keystoneForwarder = _keystoneForwarder;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setKeystoneForwarder(address newForwarder) external onlyOwner {
        keystoneForwarder = newForwarder;
        emit ForwarderUpdated(newForwarder);
    }

    // ── IReceiver ─────────────────────────────────────────────────────────────

    /// @notice Called by the CRE KeystoneForwarder after DON consensus.
    ///         `metadata` = 64 bytes (workflowId || workflowName || workflowOwner || reportId)
    ///         `report`   = abi.encode({bytes32 userPubkeyHash, string[] matchedIds})
    function onReport(bytes calldata /*metadata*/, bytes calldata report) external {
        if (msg.sender != keystoneForwarder) revert NotForwarder();
        if (report.length < 64) revert InvalidReport();

        (bytes32 userPubkeyHash, string[] memory ids) = abi.decode(report, (bytes32, string[]));
        for (uint256 i = 0; i < ids.length; i++) {
            _matches[userPubkeyHash].push(ids[i]);
            emit MatchAdded(userPubkeyHash, ids[i]);
        }
    }

    /// @notice ERC-165 support (required by KeystoneForwarder)
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // IReceiver: bytes4(keccak256("onReport(bytes,bytes)")) = 0x35b16d3d
        return interfaceId == 0x35b16d3d || interfaceId == 0x01ffc9a7;
    }

    // ── Client reads ──────────────────────────────────────────────────────────

    function getMatches(bytes32 userPubkeyHash) external view returns (string[] memory) {
        return _matches[userPubkeyHash];
    }

    /// @notice Owner-only write for testing without CRE forwarder.
    function addMatchesDirect(bytes32 userPubkeyHash, string[] calldata announcementIds) external onlyOwner {
        for (uint256 i = 0; i < announcementIds.length; i++) {
            _matches[userPubkeyHash].push(announcementIds[i]);
            emit MatchAdded(userPubkeyHash, announcementIds[i]);
        }
    }

    /// @notice Clear a notification slot.
    ///         Owner or slot keyholder (proves sha256(pubkey) == userPubkeyHash) may clear.
    function clearMatches(bytes32 userPubkeyHash, bytes calldata pubkeyPreimage) external {
        bool isOwner = msg.sender == owner;
        bool isSelf = pubkeyPreimage.length > 0 &&
                      sha256(pubkeyPreimage) == userPubkeyHash;
        if (!isOwner && !isSelf) revert NotForwarder();
        delete _matches[userPubkeyHash];
    }
}
