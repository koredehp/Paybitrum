// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Paybitrum} from "../src/Paybitrum.sol";

import {MockUSDC} from "../src/MockUSDC.sol";

contract PaybitrumTest is Test {
    Paybitrum escrow;
    MockUSDC usdc;

    address client = makeAddr("client");
    address freelancer = makeAddr("freelancer");
    address stranger = makeAddr("stranger");

    uint256 constant AMOUNT = 1000e6;
    uint64 deadline;

    function setUp() public {
        escrow = new Paybitrum();
        usdc = new MockUSDC();
        usdc.mint(client, AMOUNT * 10);
        vm.prank(client);
        usdc.approve(address(escrow), type(uint256).max);
        deadline = uint64(block.timestamp + 3 days);
    }

    function _create() internal returns (uint256 id) {
        vm.prank(client);
        id = escrow.createEscrow(freelancer, IERC20(address(usdc)), AMOUNT, deadline);
    }

    function test_CreateLocksFunds() public {
        uint256 id = _create();
        assertEq(id, 1);
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT);
        assertEq(usdc.balanceOf(client), AMOUNT * 9);
    }

    function test_HappyPath_SubmitThenRelease() public {
        uint256 id = _create();

        vm.prank(freelancer);
        escrow.submitWork(id, keccak256("my work"));

        vm.prank(client);
        escrow.release(id);

        assertEq(usdc.balanceOf(freelancer), AMOUNT);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_RefundAfterDeadline() public {
        uint256 id = _create();
        vm.warp(deadline + 1);

        vm.prank(client);
        escrow.refund(id);

        assertEq(usdc.balanceOf(client), AMOUNT * 10);
    }

    function test_RefundBeforeDeadlineReverts() public {
        uint256 id = _create();
        vm.prank(client);
        vm.expectRevert(Paybitrum.DeadlineNotPassed.selector);
        escrow.refund(id);
    }

    function test_CannotRefundAfterWorkSubmitted() public {
        uint256 id = _create();
        vm.prank(freelancer);
        escrow.submitWork(id, keccak256("work"));

        vm.warp(deadline + 1);
        vm.prank(client);
        vm.expectRevert(Paybitrum.WrongStatus.selector);
        escrow.refund(id);
    }

    function test_OnlyClientCanRelease() public {
        uint256 id = _create();
        vm.prank(stranger);
        vm.expectRevert(Paybitrum.NotClient.selector);
        escrow.release(id);
    }

    function test_OnlyFreelancerCanSubmit() public {
        uint256 id = _create();
        vm.prank(stranger);
        vm.expectRevert(Paybitrum.NotFreelancer.selector);
        escrow.submitWork(id, keccak256("work"));
    }

    function test_SubmitAfterDeadlineReverts() public {
        uint256 id = _create();
        vm.warp(deadline + 1);
        vm.prank(freelancer);
        vm.expectRevert(Paybitrum.DeadlinePassed.selector);
        escrow.submitWork(id, keccak256("late"));
    }

    function test_ClaimAfterReviewPeriod() public {
        uint256 id = _create();
        vm.prank(freelancer);
        escrow.submitWork(id, keccak256("work"));

        vm.warp(block.timestamp + 7 days);
        vm.prank(freelancer);
        escrow.claimAfterReview(id);

        assertEq(usdc.balanceOf(freelancer), AMOUNT);
    }

    function test_ClaimBeforeReviewPeriodReverts() public {
        uint256 id = _create();
        vm.prank(freelancer);
        escrow.submitWork(id, keccak256("work"));

        vm.prank(freelancer);
        vm.expectRevert(Paybitrum.ReviewPeriodActive.selector);
        escrow.claimAfterReview(id);
    }

    function test_CannotReleaseTwice() public {
        uint256 id = _create();
        vm.startPrank(client);
        escrow.release(id);
        vm.expectRevert(Paybitrum.WrongStatus.selector);
        escrow.release(id);
        vm.stopPrank();
    }

    function test_InvalidParamsReverts() public {
        vm.prank(client);
        vm.expectRevert(Paybitrum.InvalidParams.selector);
        escrow.createEscrow(freelancer, IERC20(address(usdc)), 0, deadline);
    }
}