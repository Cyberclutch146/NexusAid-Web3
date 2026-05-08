# NexusAid Web3 Platform

NexusAid is a decentralized, transparent, and modular disaster relief and crowdfunding platform built to empower communities globally. Leveraging Polygon (Amoy testnet) and a robust Next.js frontend, NexusAid ensures accountability in charitable giving through cryptographic proof of donations and milestone-based escrow contracts.

## Architecture

The project has recently been refactored into a scalable monorepo structure:
- **/frontend**: Next.js 14+ application handling the user interface, wallet connections (ethers.js), and integration with Firebase/Smart Contracts.
- **/backend**: Dedicated standalone backend (Express/Firebase Functions) for off-chain tasks like sending emails, heavy computations, or webhooks.
- **/contracts**: Hardhat development environment containing all Solidity smart contracts (`NexusDonate.sol`, `NexusEscrow.sol`, `NexusReputation.sol`), tests, and deployment scripts.
- **/documentation**: Centralized repository for all technical documentation, roadmaps, and architectural decisions.

## Core Features
1. **Decentralized Donations:** Direct peer-to-peer crypto donations via the `NexusDonate` smart contract.
2. **Escrow & Milestone System:** Accountability-driven funding using `NexusEscrow`. Organizers propose milestones, which must be approved by admins (or a DAO) before funds unlock.
3. **Reputation & Badging (SBTs):** Non-transferable Soulbound Tokens (SBTs) via `NexusReputation` representing a user's on-chain relief effort impact (e.g., Bronze, Silver, Gold, Platinum, Diamond badges).
4. **Fiat & Web2 Integrations:** Razorpay gateway and Firebase Authentication/Firestore for traditional onboarding, bridging the gap between Web2 and Web3.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MetaMask or another web3 wallet

### 1. Install Dependencies
From the root directory, install all workspace dependencies:
```bash
npm install
```

### 2. Local Blockchain Node
Start the local Hardhat node to deploy contracts and test locally:
```bash
cd contracts
npx hardhat node
```
*Note: In another terminal, run deployment scripts if testing fresh instances:*
```bash
npx hardhat run scripts/deploy/deploy-donate.js --network localhost
npx hardhat run scripts/deploy/deploy-escrow.js --network localhost
npx hardhat run scripts/deploy/deploy-reputation.js --network localhost
```

### 3. Run the Frontend
Run the development server for the Next.js frontend:
```bash
npm run dev:frontend
```
*Ensure your `.env.local` inside the `frontend/` directory is properly configured with your deployed contract addresses.*

## Contributing
Please refer to the `PROJECT_STATUS.md` and `ROADMAP.md` files for ongoing initiatives and strategic features.
