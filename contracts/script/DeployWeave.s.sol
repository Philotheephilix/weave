// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {WeavePermissionedRegistry} from "../src/WeavePermissionedRegistry.sol";
import {WeaveWildcardResolver} from "../src/WeaveWildcardResolver.sol";
import {WeaveRegistrar} from "../src/WeaveRegistrar.sol";
import {NotificationLog} from "../src/NotificationLog.sol";

contract DeployWeave is Script {
    // Replace after CRE workflow deployment
    address constant CRE_FORWARDER_PLACEHOLDER = address(0xdead);

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        WeaveWildcardResolver resolver = new WeaveWildcardResolver();
        WeavePermissionedRegistry registry = new WeavePermissionedRegistry(address(resolver));
        WeaveRegistrar registrar = new WeaveRegistrar(address(registry), address(resolver));
        NotificationLog notifLog = new NotificationLog(CRE_FORWARDER_PLACEHOLDER);

        registry.grantRegistrar(address(registrar));
        resolver.authorizeSetterRole(address(registrar), true);

        vm.stopBroadcast();

        console.log("WeaveWildcardResolver:     ", address(resolver));
        console.log("WeavePermissionedRegistry: ", address(registry));
        console.log("WeaveRegistrar:            ", address(registrar));
        console.log("NotificationLog:           ", address(notifLog));
        console.log("Deployer:                  ", deployer);
    }
}
