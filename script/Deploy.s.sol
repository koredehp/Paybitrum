// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Paybitrum} from "../src/Paybitrum.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        Paybitrum escrow = new Paybitrum();
        MockUSDC usdc = new MockUSDC();
        vm.stopBroadcast();

        console.log("Paybitrum:", address(escrow));
        console.log("MockUSDC:", address(usdc));
    }
}