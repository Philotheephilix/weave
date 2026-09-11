// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {WeavePermissionedRegistry} from "./WeavePermissionedRegistry.sol";
import {WeaveWildcardResolver} from "./WeaveWildcardResolver.sol";

/// @dev ENSv2 PermissionedRegistry interface (the ETH-level registry that owns weave.eth).
///      setSubregistry wires subname→subregistry; setResolver sets the wildcard resolver.
interface IENSv2Registry {
    function setSubregistry(uint256 anyId, address subregistry) external;
    function setResolver(uint256 anyId, address resolver) external;
    function getSubregistry(string calldata label) external view returns (address);
    function getResolver(string calldata label) external view returns (address);
}

/// @dev Public entry point for handle registration.
///      Calls WeavePermissionedRegistry.register* + WeaveWildcardResolver.setIdentity atomically.
///      Optionally mirrors org registrations into ENSv2 ETH Registry so the
///      Universal Resolver can traverse into our subregistry for *.weave.eth.
contract WeaveRegistrar {
    WeavePermissionedRegistry public immutable registry;
    WeaveWildcardResolver     public immutable resolver;
    /// @dev ENSv2 ETH Registry on Sepolia (0xbdc85dd5...). Zero = ENSv2 mirroring disabled.
    IENSv2Registry            public immutable ensv2Registry;

    // labelhash("weave") — token ID used in ENSv2 ETH Registry
    bytes32 public constant WEAVE_LABEL_HASH =
        0xb99b35046f693c814b9cadb2a27210be9967bb05de4b54fd70c7d5c5f2912617;

    address public owner;

    // orgLabel => admin address (the account that deployed the org)
    mapping(bytes32 => address) public orgAdmins;

    event Registered(string label, address indexed owner, string tier);
    event OrgRegistered(string orgLabel, address indexed admin);
    event MemberEnrolled(string orgLabel, string memberLabel, address indexed memberAddr);
    event OwnershipTransferred(address indexed prev, address indexed next);

    error NotOwner();
    error NotOrgAdmin();
    error OrgNotFound();
    error OrgAlreadyExists();

    /// @param _ensv2Registry ENSv2 ETHRegistry address (0xbdc85dd5... on Sepolia).
    ///                       Pass address(0) to disable ENSv2 mirroring.
    constructor(address _registry, address _resolver, address _ensv2Registry) {
        registry = WeavePermissionedRegistry(_registry);
        resolver = WeaveWildcardResolver(_resolver);
        ensv2Registry = IENSv2Registry(_ensv2Registry);
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

    // Register an org: creates orgname.weave.eth (member token) +
    // admin.orgname.weave.eth (operator token, transferable).
    // Caller becomes the org admin. No contract-owner permission required.
    // Also registers orgname.weave.eth in the ENSv2 ETH Registry so the
    // Universal Resolver can resolve *.orgname.weave.eth via ENSIP-10.
    function registerOrg(
        string calldata orgLabel,
        address adminAddr,
        WeaveWildcardResolver.WeaveIdentity calldata adminIdentity
    ) external {
        // Org subname: orgLabel (e.g. "google")
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] != address(0)) revert OrgAlreadyExists();
        registry.registerMember(orgLabel, adminAddr);
        resolver.setIdentity(orgLh, adminIdentity);

        // Admin subname: "admin." + orgLabel (e.g. "admin.google")
        string memory adminLabel = string(abi.encodePacked("admin.", orgLabel));
        bytes32 adminLh = keccak256(bytes(adminLabel));
        registry.registerOperator(adminLabel, adminAddr);
        resolver.setIdentity(adminLh, adminIdentity);

        orgAdmins[orgLh] = adminAddr;

        emit OrgRegistered(orgLabel, adminAddr);
        emit Registered(orgLabel, adminAddr, "org");
        emit Registered(adminLabel, adminAddr, "admin");
    }

    // Enroll a member into an org. Only callable by the org's admin address.
    // Creates memberLabel.orgLabel (e.g. "philo.google") as a member token.
    function enrollMember(
        string calldata orgLabel,
        string calldata memberLabel,
        address memberAddr,
        WeaveWildcardResolver.WeaveIdentity calldata memberIdentity
    ) external {
        bytes32 orgLh = keccak256(bytes(orgLabel));
        if (orgAdmins[orgLh] == address(0)) revert OrgNotFound();
        if (orgAdmins[orgLh] != msg.sender) revert NotOrgAdmin();

        // Full label: "philo.google"
        string memory fullLabel = string(abi.encodePacked(memberLabel, ".", orgLabel));
        bytes32 fullLh = keccak256(bytes(fullLabel));
        registry.registerMember(fullLabel, memberAddr);
        resolver.setIdentity(fullLh, memberIdentity);

        emit MemberEnrolled(orgLabel, memberLabel, memberAddr);
        emit Registered(fullLabel, memberAddr, "member");
    }

    // Only contract owner can register — prevents arbitrary self-registration
    function registerMember(
        string calldata label,
        address tokenOwner,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external onlyOwner {
        bytes32 lh = keccak256(bytes(label));
        registry.registerMember(label, tokenOwner);
        resolver.setIdentity(lh, identity);
        emit Registered(label, tokenOwner, "member");
    }

    function registerGuest(
        string calldata label,
        address guestAddr,
        uint64 durationSeconds,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external onlyOwner {
        bytes32 lh = keccak256(bytes(label));
        registry.registerGuest(label, guestAddr, durationSeconds);
        resolver.setIdentity(lh, identity);
        emit Registered(label, guestAddr, "guest");
    }

    function registerOperator(
        string calldata label,
        address tokenOwner,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external onlyOwner {
        bytes32 lh = keccak256(bytes(label));
        registry.registerOperator(label, tokenOwner);
        resolver.setIdentity(lh, identity);
        emit Registered(label, tokenOwner, "operator");
    }

    // Owner override — needed for key compromise, abuse, or label reclamation.
    // Regular unregisterMember requires expiry to have passed.
    function forceUnregister(string calldata label) external onlyOwner {
        registry.forceUnregister(label);
        resolver.clearIdentity(keccak256(bytes(label)));
    }

    function updateIdentity(
        string calldata label,
        WeaveWildcardResolver.WeaveIdentity calldata identity
    ) external {
        bytes32 lh = keccak256(bytes(label));
        require(registry.ownerOf(lh) == msg.sender, "Not owner");
        // Guests cannot update after expiry
        (, , , uint64 expiry, ) = registry.recordData(lh);
        require(expiry == 0 || expiry >= block.timestamp, "Registration expired");
        resolver.setIdentity(lh, identity);
    }
}
