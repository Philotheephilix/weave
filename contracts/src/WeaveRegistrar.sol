// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {WeavePermissionedRegistry} from "./WeavePermissionedRegistry.sol";
import {WeaveWildcardResolver} from "./WeaveWildcardResolver.sol";

/// @dev Public entry point for handle registration.
///      Calls registry.register* then resolver.setIdentity atomically.
contract WeaveRegistrar {
    WeavePermissionedRegistry public immutable registry;
    WeaveWildcardResolver     public immutable resolver;

    address public owner;

    event Registered(string label, address indexed owner, string tier);
    event OwnershipTransferred(address indexed prev, address indexed next);

    error NotOwner();

    constructor(address _registry, address _resolver) {
        registry = WeavePermissionedRegistry(_registry);
        resolver = WeaveWildcardResolver(_resolver);
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

    function registerMember(
        string calldata label,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external {
        bytes32 lh = keccak256(bytes(label));
        registry.registerMember(label, msg.sender);
        resolver.setIdentity(lh, identity);
        emit Registered(label, msg.sender, "member");
    }

    function registerGuest(
        string calldata label,
        address guestAddr,
        uint64 durationSeconds,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external {
        bytes32 lh = keccak256(bytes(label));
        registry.registerGuest(label, guestAddr, durationSeconds);
        resolver.setIdentity(lh, identity);
        emit Registered(label, guestAddr, "guest");
    }

    function registerOperator(
        string calldata label,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external {
        bytes32 lh = keccak256(bytes(label));
        registry.registerOperator(label, msg.sender);
        resolver.setIdentity(lh, identity);
        emit Registered(label, msg.sender, "operator");
    }

    function updateIdentity(
        string calldata label,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external {
        bytes32 lh = keccak256(bytes(label));
        // Only current token owner can update
        require(registry.ownerOf(lh) == msg.sender, "Not owner");
        resolver.setIdentity(lh, identity);
    }
}
