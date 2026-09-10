// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @dev Receives CRE Confidential Workflow output: matched ERC-5564 announcement IDs.
///      Only the CRE DON forwarder address can write.
///      Weave client polls getMatches(sha256(stealthViewKey)) to detect incoming calls.
contract NotificationLog {
    mapping(bytes32 => string[]) private _matches;

    // Set after CRE workflow deployment; updatable by owner for Phase 1
    address public creForwarder;
    address public owner;

    event MatchAdded(bytes32 indexed userPubkeyHash, string announcementId);
    event ForwarderUpdated(address indexed newForwarder);

    error NotForwarder();
    error NotOwner();

    constructor(address _creForwarder) {
        creForwarder = _creForwarder;
        owner = msg.sender;
    }

    modifier onlyCreForwarder() {
        if (msg.sender != creForwarder) revert NotForwarder();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice Set forwarder after CRE workflow is deployed
    function setCreForwarder(address newForwarder) external onlyOwner {
        creForwarder = newForwarder;
        emit ForwarderUpdated(newForwarder);
    }

    /// @notice Called by CRE DON after TEE scanning completes
    function addMatches(bytes32 userPubkeyHash, string[] calldata announcementIds)
        external onlyCreForwarder
    {
        for (uint256 i = 0; i < announcementIds.length; i++) {
            _matches[userPubkeyHash].push(announcementIds[i]);
            emit MatchAdded(userPubkeyHash, announcementIds[i]);
        }
    }

    function getMatches(bytes32 userPubkeyHash) external view returns (string[] memory) {
        return _matches[userPubkeyHash];
    }

    /// @notice Clear a notification slot.
    ///         The CRE forwarder, owner, or the slot's own keyholder may clear.
    ///         Keyholder self-service: pass the raw spend pubkey bytes; the contract
    ///         verifies sha256(pubkey) == userPubkeyHash before deleting.
    function clearMatches(bytes32 userPubkeyHash, bytes calldata pubkeyPreimage) external {
        bool isTrusted = msg.sender == creForwarder || msg.sender == owner;
        bool isSelf = pubkeyPreimage.length > 0 &&
                      sha256(pubkeyPreimage) == userPubkeyHash;
        if (!isTrusted && !isSelf) revert NotForwarder();
        delete _matches[userPubkeyHash];
    }
}
