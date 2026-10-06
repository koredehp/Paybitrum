# Paybitrum

Escrow payments for remote work, built on Arbitrum.

Freelancers and clients often work across borders with no shared legal system
and no trusted intermediary. Paybitrum removes the need for trust between
strangers by locking payment in a smart contract before work begins, and
releasing it automatically under clear, on-chain rules.

## How it works

1. **Client creates an escrow** — picks a freelancer, a token, an amount and
   a deadline. Funds move into the contract immediately.
2. **Freelancer submits work** — records a hash referencing the delivered
   work before the deadline.
3. **Client releases payment** — approves the work and funds go straight to
   the freelancer.
4. **Safety nets**, so neither side can be stuck:
   - If the freelancer never submits by the deadline, the client can
     **refund** themselves.
   - If the freelancer submits and the client goes silent for 7 days, the
     freelancer can **claim** the payment directly.

## Why Arbitrum

Low fees and fast finality make on-chain escrow practical for everyday
freelance payments, where margins are thin and clients may be paying from
anywhere in the world. Paybitrum is deployed and tested on Arbitrum Sepolia.

## Live deployment (Arbitrum Sepolia testnet)

| Contract   | Address |
|------------|---------|
| Paybitrum (escrow) | [`0x4A4234c59A19685eeDd77f1357e7ff2B33477F76`](https://sepolia.arbiscan.io/address/0x4A4234c59A19685eeDd77f1357e7ff2B33477F76) |
| MockUSDC (test token) | [`0x358f92e74Af2cC5A825d1E5088a709911eAbF1C0`](https://sepolia.arbiscan.io/address/0x358f92e74Af2cC5A825d1E5088a709911eAbF1C0) |

## Tech stack

- **Smart contracts:** Solidity, Foundry, OpenZeppelin (`SafeERC20`,
  `ReentrancyGuard`)
- **Frontend:** React, TypeScript, Vite, wagmi, viem

## Project structure

src/ Solidity contracts (Paybitrum.sol, MockUSDC.sol)
test/ Foundry tests
script/ Deployment script
frontend/ React app (wallet connect, create/submit/release UI)



## Running locally

### Contracts

```bash
forge install
forge test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the app, connect a wallet on Arbitrum Sepolia, and use the on-page
"Mint 1,000 test USDC" button to get test funds.

## Deploying your own copy

```bash
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Known limitations

- Fee-on-transfer tokens are not supported.
- No dispute resolution yet beyond the deadline/review-period safety nets;
  see Roadmap.
- `block.timestamp` is used for deadlines; this is acceptable at day-scale
  granularity despite validator timestamp manipulation being possible at
  the second scale.

## Roadmap

- Dispute resolution / arbitration
- Milestone-based partial releases
- Reputation system for clients and freelancers
- Native Arbitrum account abstraction for gasless freelancer onboarding

## License

MIT