# Pledge Protocol

A **trust-minimized, decentralized crowdfunding protocol** built on Ethereum. Inspired by Kickstarter but fully on-chain — no custody, no intermediaries, no admin keys.

## Overview

Pledge enables creators to launch crowdfunding campaigns where:
- Funds are escrowed entirely in smart contracts
- Success releases funds to creator
- Failure enables automatic refunds to backers
- No platform custody or admin overrides

## Protocol Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLEDGE PROTOCOL FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CREATE                    2. FUND                     3. ESCROW          │
│  ┌─────────────┐             ┌─────────────┐             ┌─────────────┐    │
│  │   Creator   │────────────▶│   Factory   │────────────▶│  Campaign   │    │
│  │             │  deploys    │   Contract  │  creates    │  Contract   │    │
│  └─────────────┘             └─────────────┘             └──────┬──────┘    │
│                                                                  │           │
│                              ┌─────────────┐                     │           │
│                              │   Backers   │─────────────────────┤           │
│                              │             │  contribute ETH     │           │
│                              └─────────────┘                     ▼           │
│                                                          ┌─────────────┐    │
│  4. DEADLINE REACHED                                     │   Escrow    │    │
│  ┌─────────────────────────────────────────────────────▶│   State     │    │
│  │                                                       └──────┬──────┘    │
│  │                                                              │           │
│  │         ┌────────────────────────┬───────────────────────────┘           │
│  │         │                        │                                        │
│  │         ▼                        ▼                                        │
│  │  ┌─────────────┐          ┌─────────────┐                                │
│  │  │  SUCCESSFUL │          │   FAILED    │                                │
│  │  │ Goal Reached│          │  Goal Missed│                                │
│  │  └──────┬──────┘          └──────┬──────┘                                │
│  │         │                        │                                        │
│  │         ▼                        ▼                                        │
│  │  ┌─────────────┐          ┌─────────────┐                                │
│  │  │   Creator   │          │   Backers   │                                │
│  │  │  Withdraws  │          │   Refund    │                                │
│  │  └─────────────┘          └─────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Protocol Flow

### 1. Campaign Creation
Creator calls `CampaignFactory.createCampaign()` with:
- Funding goal (in ETH)
- Duration (1-365 days)
- Title and description

A new immutable `Campaign` contract is deployed.

### 2. Funding Phase
- Backers call `Campaign.contribute()` with ETH
- Contributions tracked per-address
- Campaign status: **Active**

### 3. Goal Evaluation
At deadline:
- If `totalRaised >= fundingGoal` → **Successful**
- If `totalRaised < fundingGoal` → **Failed**

### 4. Fund Release
- **Successful**: Creator calls `withdraw()` to receive all funds
- **Failed**: Each backer calls `refund()` to reclaim contribution

### 5. Optional: Early Cancel
Creator can `cancel()` before deadline, enabling refunds.

---

## Quick Start

```bash
# Install dependencies
yarn install

# Start local blockchain
yarn chain

# Deploy contracts
yarn deploy

# Start frontend
yarn start
```

## Tech Stack

### Smart Contracts (Foundry)
- **Solidity 0.8.19+**
- **OpenZeppelin**: ReentrancyGuard, SafeERC20
- **Foundry**: Testing & deployment

### Frontend (Next.js)
- **Next.js 15** (App Router)
- **React 19** + TypeScript
- **Wagmi + Viem** for contract interaction
- **RainbowKit** for wallet connection
- **Tailwind CSS + DaisyUI** for styling
- **Zustand** for UI state
- **Zod** for validation

---

## Project Structure

```
packages/
├── foundry/
│   ├── contracts/
│   │   ├── Campaign.sol          # Individual campaign contract
│   │   └── CampaignFactory.sol   # Factory for deploying campaigns
│   ├── script/
│   │   ├── Deploy.s.sol
│   │   └── DeployCampaignFactory.s.sol
│   └── test/
│       └── Campaign.t.sol        # Comprehensive Foundry tests
│
└── nextjs/
    ├── app/
    │   ├── page.tsx              # Landing page
    │   └── campaigns/
    │       ├── page.tsx          # Campaign listing
    │       ├── create/page.tsx   # Create campaign
    │       └── [address]/page.tsx # Campaign details
    ├── services/store/
    │   └── campaignStore.ts      # Zustand store
    └── utils/campaign/
        └── schemas.ts            # Zod validation schemas
```

---

## Smart Contract API

### CampaignFactory

| Function | Description |
|----------|-------------|
| `createCampaign(goal, days, title, desc)` | Deploy new campaign |
| `getAllCampaigns()` | Get all campaign addresses |
| `getCampaignsByCreator(address)` | Get creator's campaigns |

### Campaign

| Function | Description |
|----------|-------------|
| `contribute()` | Send ETH to campaign |
| `withdraw()` | Creator withdraws (if successful) |
| `refund()` | Backer refunds (if failed/cancelled) |
| `finalize()` | Update status after deadline |
| `cancel()` | Creator cancels (before deadline) |

---

## Security Features

### Implemented
- ✅ Checks-Effects-Interactions pattern
- ✅ ReentrancyGuard on all external calls
- ✅ Pull-based payments (no push)
- ✅ Immutable constructor parameters
- ✅ Explicit require() messages
- ✅ Input validation

### Avoided
- ❌ `tx.origin` (never used)
- ❌ `block.number` for time (uses `block.timestamp`)
- ❌ Unbounded loops
- ❌ Admin backdoors
- ❌ Upgradeable proxies

---

## Testing

Run Foundry tests:

```bash
cd packages/foundry
forge test -vvv
```

Tests cover:
- Campaign creation via factory
- Contribution logic
- Success path (goal reached → withdraw)
- Failure path (goal missed → refund)
- Cancellation and refund
- Edge cases (deadline, overfunding, double refund)

---

## Deployment

### Local (Anvil)
```bash
yarn chain    # Terminal 1
yarn deploy   # Terminal 2
yarn start    # Terminal 3
```

### Testnet (Sepolia)
```bash
yarn deploy --network sepolia
yarn verify --network sepolia
```

---

## Design Principles

1. **Trust-minimized over trust-based** — Smart contracts enforce all rules
2. **Deterministic over discretionary** — No human judgment required
3. **Simple over clever** — Readable, auditable code
4. **Secure over feature-rich** — Security is non-negotiable

---

## License

MIT

---

Built with [Scaffold-ETH 2](https://scaffoldeth.io) 🏗️
