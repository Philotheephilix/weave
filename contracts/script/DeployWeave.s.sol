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
    address constant ENS_ETH_REGISTRY  = 0xbDc85dd5b15D7ecB354CD7cB6f2C50b4F2C4f0e2;

    // Replace after CRE workflow deployment
    address constant CRE_FORWARDER_PLACEHOLDER = address(0xdead);

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
        NotificationLog notifLog = new NotificationLog(CRE_FORWARDER_PLACEHOLDER);

        // Wire internal roles
        registry.grantRegistrar(address(registrar));
        resolver.authorizeSetterRole(address(registrar), true);

        // Wire resolver into ENSv2 ETHRegistry so *.weave.eth resolves via ENSIP-10.
        // Requires deployer to own weave.eth on Sepolia ENSv2.
        IENSEthRegistry ensRegistry = IENSEthRegistry(ENS_ETH_REGISTRY);
        ensRegistry.setResolver(WEAVE_ETH_NODE, address(resolver));

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
