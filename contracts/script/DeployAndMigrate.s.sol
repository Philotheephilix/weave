// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {WeavePermissionedRegistry} from "../src/WeavePermissionedRegistry.sol";
import {WeaveWildcardResolver} from "../src/WeaveWildcardResolver.sol";
import {WeaveRegistrar} from "../src/WeaveRegistrar.sol";
import {NotificationLog} from "../src/NotificationLog.sol";

contract DeployAndMigrate is Script {
    address constant ENS_ETH_REGISTRY  = 0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2;
    address constant KEYSTONE_FORWARDER = 0xF8344CFd5c43616a4366C34E3EEE75af79a74482;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        WeaveWildcardResolver resolver = new WeaveWildcardResolver();
        WeavePermissionedRegistry registry = new WeavePermissionedRegistry(address(resolver));
        WeaveRegistrar registrar = new WeaveRegistrar(address(registry), address(resolver), ENS_ETH_REGISTRY);
        NotificationLog notifLog = new NotificationLog(KEYSTONE_FORWARDER);

        registry.grantRegistrar(address(registrar));
        resolver.authorizeSetterRole(address(registrar), true);

        // setResolver and setSubregistry on ENSv2 are called separately via cast send
        // (requires uint256 token ID, not bytes32 node)

        vm.stopBroadcast();

        console.log("WeaveWildcardResolver:     ", address(resolver));
        console.log("WeavePermissionedRegistry: ", address(registry));
        console.log("WeaveRegistrar:            ", address(registrar));
        console.log("NotificationLog:           ", address(notifLog));
        console.log("Deployer:                  ", deployer);
    }
}
