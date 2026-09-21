// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Paybitrum
/// @notice Simple ERC-20 escrow for remote work payments on Arbitrum.
contract Paybitrum is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status { None, Funded, Submitted, Released, Refunded }

    struct Escrow {
        address client;
        address freelancer;
        IERC20 token;
        uint256 amount;
        uint64 deadline;
        uint64 submittedAt;
        bytes32 workHash;
        Status status;
    }

    uint64 public constant REVIEW_PERIOD = 7 days;

    uint256 public escrowCount;
    mapping(uint256 => Escrow) public escrows;

    event EscrowCreated(uint256 indexed id, address indexed client, address indexed freelancer, address token, uint256 amount, uint64 deadline);
    event WorkSubmitted(uint256 indexed id, bytes32 workHash);
    event Released(uint256 indexed id, address indexed freelancer, uint256 amount);
    event Refunded(uint256 indexed id, address indexed client, uint256 amount);

    error InvalidParams();
    error NotClient();
    error NotFreelancer();
    error WrongStatus();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error ReviewPeriodActive();

    /// @notice Client locks funds. Client must approve this contract for `amount` first.
    function createEscrow(address freelancer, IERC20 token, uint256 amount, uint64 deadline)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (freelancer == address(0) || freelancer == msg.sender || amount == 0 || deadline <= block.timestamp) {
            revert InvalidParams();
        }

        id = ++escrowCount;
        escrows[id] = Escrow({
            client: msg.sender,
            freelancer: freelancer,
            token: token,
            amount: amount,
            deadline: deadline,
            submittedAt: 0,
            workHash: bytes32(0),
            status: Status.Funded
        });

        token.safeTransferFrom(msg.sender, address(this), amount);
        emit EscrowCreated(id, msg.sender, freelancer, address(token), amount, deadline);
    }

    /// @notice Freelancer marks work as delivered (before the deadline).
    function submitWork(uint256 id, bytes32 workHash) external {
        Escrow storage e = escrows[id];
        if (msg.sender != e.freelancer) revert NotFreelancer();
        if (e.status != Status.Funded) revert WrongStatus();
        if (block.timestamp > e.deadline) revert DeadlinePassed();

        e.status = Status.Submitted;
        e.submittedAt = uint64(block.timestamp);
        e.workHash = workHash;
        emit WorkSubmitted(id, workHash);
    }

    /// @notice Client approves and pays the freelancer.
    function release(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (msg.sender != e.client) revert NotClient();
        if (e.status != Status.Funded && e.status != Status.Submitted) revert WrongStatus();
        _payFreelancer(id, e);
    }

    /// @notice Freelancer claims payment if the client stays silent after submission.
    function claimAfterReview(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (msg.sender != e.freelancer) revert NotFreelancer();
        if (e.status != Status.Submitted) revert WrongStatus();
        if (block.timestamp < e.submittedAt + REVIEW_PERIOD) revert ReviewPeriodActive();
        _payFreelancer(id, e);
    }

    /// @notice Client reclaims funds if no work was submitted by the deadline.
    function refund(uint256 id) external nonReentrant {
        Escrow storage e = escrows[id];
        if (msg.sender != e.client) revert NotClient();
        if (e.status != Status.Funded) revert WrongStatus();
        if (block.timestamp <= e.deadline) revert DeadlineNotPassed();

        e.status = Status.Refunded;
        e.token.safeTransfer(e.client, e.amount);
        emit Refunded(id, e.client, e.amount);
    }

    function _payFreelancer(uint256 id, Escrow storage e) private {
        e.status = Status.Released;
        e.token.safeTransfer(e.freelancer, e.amount);
        emit Released(id, e.freelancer, e.amount);
    }
}