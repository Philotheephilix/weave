// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {WeavePermissionedRegistry} from "../src/WeavePermissionedRegistry.sol";
import {WeaveWildcardResolver} from "../src/WeaveWildcardResolver.sol";
import {WeaveRegistrar} from "../src/WeaveRegistrar.sol";
import {NotificationLog} from "../src/NotificationLog.sol";

interface IENSEthRegistry {
    function setResolver(bytes32 node, address resolver) external;
    function getResolver(string calldata label) external view returns (address);
}

/// @dev Deploy fresh contracts and wire the ENSv2 resolver in one broadcast.
///      Previous WeavePermissionedRegistry and WeaveWildcardResolver are superseded;
///      existing identities in the old resolver need to be re-enrolled via the app.
contract DeployAndMigrate is Script {
    address constant ENS_ETH_REGISTRY = 0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2;
    address constant KEYSTONE_FORWARDER = 0xF8344CFd5c43616a4366C34E3EEE75af79a74482;

    // namehash("weave.eth")
    bytes32 constant WEAVE_ETH_NODE =
        keccak256(abi.encodePacked(
            keccak256(abi.encodePacked(bytes32(0), keccak256("eth"))),
            keccak256("weave")
        ));

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        WeaveWildcardResolver resolver = new WeaveWildcardResolver();
        WeavePermissionedRegistry registry = new WeavePermissionedRegistry(address(resolver));
        WeaveRegistrar registrar = new WeaveRegistrar(address(registry), address(resolver), ENS_ETH_REGISTRY);
        NotificationLog notifLog = new NotificationLog(KEYSTONE_FORWARDER);

        // Wire internal roles
        registry.grantRegistrar(address(registrar));
        resolver.authorizeSetterRole(address(registrar), true);

        // Wire resolver into ENSv2 so *.weave.eth resolves via ENSIP-10
        IENSEthRegistry(ENS_ETH_REGISTRY).setResolver(WEAVE_ETH_NODE, address(resolver));

        vm.stopBroadcast();

        console.log("WeaveWildcardResolver:     ", address(resolver));
        console.log("WeavePermissionedRegistry: ", address(registry));
        console.log("WeaveRegistrar:            ", address(registrar));
        console.log("NotificationLog:           ", address(notifLog));
        console.log("Deployer:                  ", deployer);
        console.log("weave.eth node:");
        console.logBytes32(WEAVE_ETH_NODE);
    }
}
