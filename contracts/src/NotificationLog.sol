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

    /// @notice Client clears its own slot after processing
    function clearMatches(bytes32 userPubkeyHash) external {
        delete _matches[userPubkeyHash];
    }
}
