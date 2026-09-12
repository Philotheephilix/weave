// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script, console} from "forge-std/Script.sol";
import {WeaveRegistrar} from "../src/WeaveRegistrar.sol";
import {WeaveWildcardResolver} from "../src/WeaveWildcardResolver.sol";

contract RegisterMembers is Script {
    WeaveRegistrar constant REGISTRAR =
        WeaveRegistrar(0xebE0f19fc67b78612421FbD0786972736feD9C98);

    function run() external {
        uint256 adminKey  = vm.envUint("ADMIN_KEY");
        address adminAddr = vm.addr(adminKey);

        vm.startBroadcast(adminKey);

        // ── google org + admin.google ─────────────────────────────────────────
        WeaveWildcardResolver.WeaveIdentity memory adminId = WeaveWildcardResolver.WeaveIdentity({
            stealthViewKey:  hex"02612f2dd334699cab460cd5c4d564e087feca0431e16fa174607e8d496411ff5c",
            stealthSpendKey: hex"039501dcc40dcf8f7dd45e32a416a99547350c1fd1d4f23bf4e371ba17f5b76bb4",
            x25519Pubkey:    hex"cc005da2f9a249397962ade640cfad28804458e3559150d9b5a14c53463dd62a",
            onionAddress:    bytes(""),
            nostrPubkey:     hex"0000000000000000000000000000000000000000000000000000000000000000",
            ethAddress:      adminAddr,
            displayName:     "Google Admin",
            avatarUrl:       "",
            registeredAt:    uint64(block.timestamp)
        });
        REGISTRAR.registerOrg("google", adminAddr, adminId);
        console.log("registerOrg(google) done");

        // ── philo.google ──────────────────────────────────────────────────────
        WeaveWildcardResolver.WeaveIdentity memory philoId = WeaveWildcardResolver.WeaveIdentity({
            stealthViewKey:  hex"0394959cd9899b23ead4b3f92d6097625ff4db75749eeeb2912a89866ecb2cc259",
            stealthSpendKey: hex"03a08f4bbc85f8c05594e71f0ef7fab0e4718fc8e284cb77a718ff5e0e2c3f8150",
            x25519Pubkey:    hex"ba3402e3692f8aa49beede12e5be26838c88343c1876fc9919a9d3a316792635",
            onionAddress:    bytes(""),
            nostrPubkey:     hex"0000000000000000000000000000000000000000000000000000000000000000",
            ethAddress:      0xa9eA381bb5cD5c691d0C004801EB7E7078d06016,
            displayName:     "Philo",
            avatarUrl:       "",
            registeredAt:    uint64(block.timestamp)
        });
        REGISTRAR.enrollMember("google", "philo", 0xa9eA381bb5cD5c691d0C004801EB7E7078d06016, philoId);
        console.log("enrollMember(philo.google) done");

        // ── davinci.google ────────────────────────────────────────────────────
        WeaveWildcardResolver.WeaveIdentity memory davinciId = WeaveWildcardResolver.WeaveIdentity({
            stealthViewKey:  hex"03483d2eeb83ac983808536895aee277931868b99b9c0dc3ea61b5b30404f51867",
            stealthSpendKey: hex"03260a01f6c39b57dbb0bfa94ad6ca286e500585f71ab50fc431fb842de25915bf",
            x25519Pubkey:    hex"602fa16ee5bec3cd3a2bcbe91d15b7e89e5fdf05bccf3f4c0ae61750b49cbdd2",
            onionAddress:    bytes(""),
            nostrPubkey:     hex"0000000000000000000000000000000000000000000000000000000000000000",
            ethAddress:      0x5542641662c206Cc9743C37A3d9234c0478caC45,
            displayName:     "Da Vinci",
            avatarUrl:       "",
            registeredAt:    uint64(block.timestamp)
        });
        REGISTRAR.enrollMember("google", "davinci", 0x5542641662c206Cc9743C37A3d9234c0478caC45, davinciId);
        console.log("enrollMember(davinci.google) done");

        vm.stopBroadcast();

        console.log("=== All registrations complete ===");
        console.log("google.weave.eth      admin:", adminAddr);
        console.log("philo.google.weave.eth:     0xa9eA381bb5cD5c691d0C004801EB7E7078d06016");
        console.log("davinci.google.weave.eth:   0x5542641662c206Cc9743C37A3d9234c0478caC45");
    }
}
