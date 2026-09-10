// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {WeavePermissionedRegistry} from "../src/WeavePermissionedRegistry.sol";
import {WeaveWildcardResolver} from "../src/WeaveWildcardResolver.sol";
import {WeaveRegistrar} from "../src/WeaveRegistrar.sol";
import {NotificationLog} from "../src/NotificationLog.sol";

// Minimal interface for ENSv2 ETHRegistry on Sepolia
interface IENSEthRegistry {
    function setResolver(bytes32 node, address resolver) external;
    function owner(bytes32 node) external view returns (address);
}

contract DeployWeave is Script {
    // ENSv2 Sepolia addresses (verified from ENS documentation)
    address constant ENS_ETH_REGISTRY  = 0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2;

    // Ethereum Sepolia KeystoneForwarder (CRE DON forwarder)
    address constant KEYSTONE_FORWARDER = 0xF8344CFd5c43616a4366C34E3EEE75af79a74482;

    // namehash("weave.eth") — precomputed
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
        WeaveRegistrar registrar = new WeaveRegistrar(address(registry), address(resolver));
        NotificationLog notifLog = new NotificationLog(KEYSTONE_FORWARDER);

        // Wire internal roles
        registry.grantRegistrar(address(registrar));
        resolver.authorizeSetterRole(address(registrar), true);

        // Wire resolver into ENSv2 ETHRegistry so *.weave.eth resolves via ENSIP-10.
        // Requires deployer to own weave.eth on Sepolia ENSv2.
        // TODO: Uncomment once weave.eth ownership is confirmed on Sepolia ENSv2.
        // IENSEthRegistry ensRegistry = IENSEthRegistry(ENS_ETH_REGISTRY);
        // ensRegistry.setResolver(WEAVE_ETH_NODE, address(resolver));

        vm.stopBroadcast();

        console.log("WeaveWildcardResolver:     ", address(resolver));
        console.log("WeavePermissionedRegistry: ", address(registry));
        console.log("WeaveRegistrar:            ", address(registrar));
        console.log("NotificationLog:           ", address(notifLog));
        console.log("Deployer:                  ", deployer);
        console.log("weave.eth node:            ");
        console.logBytes32(WEAVE_ETH_NODE);
    }
}
