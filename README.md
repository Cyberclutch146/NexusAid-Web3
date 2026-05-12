# 🌐 NexusAid — Decentralized Disaster Relief & Crowdfunding Platform

<div align="center">

**Transparent. Accountable. On-Chain.**

NexusAid is a modular, Web3-native disaster relief and crowdfunding platform that combines the accessibility of Web2 (Firebase, Razorpay, AI) with the transparency and trust guarantees of blockchain (Solidity smart contracts, Soulbound Tokens, milestone-gated escrow). Every donation, every milestone, every badge — cryptographically verified and permanently recorded on-chain.

![Next.js](https://img.shields.io/badge/Next.js-16.2.4-black?logo=next.js)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)
![Ethers.js](https://img.shields.io/badge/Ethers.js-v6-2535a0?logo=ethereum)
![Hardhat](https://img.shields.io/badge/Hardhat-2.22-yellow?logo=hardhat)
![Firebase](https://img.shields.io/badge/Firebase-12.x-orange?logo=firebase)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## Table of Contents

- [Why NexusAid?](#why-nexusaid)
- [Architecture Overview](#architecture-overview)
- [Monorepo Structure](#monorepo-structure)
- [Tech Stack](#tech-stack)
- [Smart Contracts](#smart-contracts)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Frontend Pages & Features](#frontend-pages--features)
- [API Routes](#api-routes)
- [MetaMask & Local Development](#metamask--local-development)
- [Deployment Targets](#deployment-targets)
- [Contributing](#contributing)
- [License](#license)

---

## Why NexusAid?

Traditional crowdfunding platforms suffer from a fundamental trust deficit: donors cannot independently verify where their money goes. NexusAid solves this by:

1. **Recording every donation on-chain** — anyone can audit the ledger.
2. **Locking large campaigns behind milestone-gated escrow** — funds only release when deliverables are verified.
3. **Issuing non-transferable Soulbound Tokens (SBTs)** — your impact reputation is permanent, unforgeable, and portable across the decentralized web.
4. **Bridging Web2 and Web3** — users who aren't crypto-native can donate via Razorpay (fiat) or connect MetaMask for on-chain donations seamlessly.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        NexusAid Monorepo                        │
├──────────────┬──────────────┬────────────────┬───────────────────┤
│   frontend/  │   backend/   │   contracts/   │  documentation/   │
│  Next.js 16  │  Express/    │   Hardhat +    │   README, Roadmap │
│  React 19    │  Firebase    │   Solidity     │   Project Status  │
│  Ethers v6   │  Functions   │   0.8.24       │   Architecture    │
│  TailwindCSS │  (stub)      │   OpenZeppelin │   Decisions       │
├──────────────┴──────────────┴────────────────┴───────────────────┤
│              npm workspaces (root package.json)                  │
└──────────────────────────────────────────────────────────────────┘
```

**Data flow:**
```
User (MetaMask) ──► Frontend (Next.js) ──► Smart Contract (Hardhat/Polygon)
                                     └──► Firebase (Firestore/Auth)
                                     └──► API Routes (/api/web3/*, /api/events/*)
```

---

## Monorepo Structure

```
NexusAid-Web3/
├── frontend/                          # Next.js 16 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/                 # Authenticated app routes
│   │   │   │   ├── home/              # Landing / hero page
│   │   │   │   ├── feed/              # Community event feed
│   │   │   │   ├── create/            # Event creation wizard
│   │   │   │   ├── event/[id]/        # Individual event page + donations
│   │   │   │   ├── dashboard/         # User dashboard hub
│   │   │   │   │   ├── blockchain/    # Blockchain Hub (wallet, badges, contracts)
│   │   │   │   │   ├── sentinel/      # AI Sentinel disaster monitoring
│   │   │   │   │   └── event/         # Organizer event management
│   │   │   │   ├── profile/           # User profile & settings
│   │   │   │   ├── leaderboard/       # Community leaderboard
│   │   │   │   └── about/             # About page
│   │   │   ├── (marketing)/           # Public marketing pages
│   │   │   └── api/                   # Next.js API routes (serverless)
│   │   │       ├── web3/              # Blockchain API endpoints
│   │   │       │   ├── claim-badge/   # Auto-evaluate & mint SBTs
│   │   │       │   ├── link-wallet/   # EIP-191 wallet verification
│   │   │       │   ├── mint-badge/    # Direct badge minting
│   │   │       │   └── milestones/    # Escrow milestone management
│   │   │       ├── events/            # CRUD for events
│   │   │       ├── auth/              # Authentication helpers
│   │   │       ├── chat/              # Real-time chat
│   │   │       ├── chatbot/           # AI chatbot endpoint
│   │   │       ├── search/            # Full-text search
│   │   │       ├── sentinel/          # Disaster intelligence API
│   │   │       ├── promote/           # Email/SMS campaign promotion
│   │   │       ├── sms/               # Twilio SMS gateway
│   │   │       ├── generate-description/ # AI event description generator
│   │   │       ├── generate-image/    # AI image generation
│   │   │       └── create-payment-order/ # Razorpay payment orders
│   │   ├── components/
│   │   │   ├── web3/                  # Blockchain UI components
│   │   │   │   ├── BadgeDisplay.tsx   # SBT badge gallery
│   │   │   │   ├── DonateWithCrypto.tsx # Crypto donation flow
│   │   │   │   └── MilestoneTracker.tsx # Escrow milestone UI
│   │   │   ├── events/                # Event cards, donation panels
│   │   │   ├── layout/                # Navbar, sidebar, footer
│   │   │   ├── ui/                    # Reusable design system components
│   │   │   ├── ai/                    # AI-powered components
│   │   │   └── map/                   # Geospatial map components
│   │   ├── hooks/
│   │   │   └── useWallet.ts           # MetaMask connection hook
│   │   ├── lib/
│   │   │   ├── web3/
│   │   │   │   ├── contract.ts        # NexusDonate contract bindings
│   │   │   │   ├── escrowContract.ts  # NexusEscrow contract bindings
│   │   │   │   └── reputationContract.ts # NexusReputation bindings
│   │   │   ├── firebase.ts            # Client-side Firebase init
│   │   │   └── firebase-admin.ts      # Server-side Firebase Admin
│   │   ├── services/                  # Business logic services
│   │   │   ├── eventService.ts        # Event CRUD operations
│   │   │   ├── userService.ts         # User profile management
│   │   │   ├── sentinelService.ts     # AI disaster intelligence
│   │   │   ├── aiActions.ts           # Gemini AI integrations
│   │   │   ├── aiTools.ts             # AI tool definitions
│   │   │   ├── chatService.ts         # Chat operations
│   │   │   ├── emailService.ts        # Nodemailer email service
│   │   │   ├── smsService.ts          # Twilio SMS service
│   │   │   ├── searchService.ts       # Search indexing
│   │   │   ├── recommendationService.ts # Event recommendations
│   │   │   ├── notificationService.ts # Push notifications
│   │   │   └── storageService.ts      # Cloud storage utilities
│   │   └── context/                   # React contexts (Auth, Theme)
│   ├── .env.local                     # Environment variables
│   └── package.json                   # Frontend dependencies
│
├── backend/                           # Standalone backend (Express/Functions)
│   └── package.json                   # Backend dependencies (stub)
│
├── contracts/                         # Hardhat + Solidity environment
│   ├── contracts/
│   │   ├── core/
│   │   │   ├── NexusDonate.sol        # Direct donation contract
│   │   │   └── NexusAidTest.sol       # Test utility contract
│   │   └── web3/
│   │       ├── NexusEscrow.sol        # Milestone-gated escrow
│   │       └── NexusReputation.sol    # Soulbound Token (SBT) badges
│   ├── scripts/
│   │   └── deploy/
│   │       ├── deploy-donate.js       # Deploy NexusDonate
│   │       ├── deploy-escrow.js       # Deploy NexusEscrow
│   │       └── deploy-reputation.js   # Deploy NexusReputation
│   ├── test/                          # Contract unit tests
│   ├── hardhat.config.js              # Network & compiler configuration
│   └── package.json                   # Contracts dependencies
│
├── documentation/                     # All project documentation
│   ├── PROJECT_STATUS.md              # Current development status
│   ├── ROADMAP.md                     # 42-feature strategic roadmap
│   └── DEPLOY_GUIDE.md                # Beginner's deployment guide
│
├── scripts/                           # Automation & Orchestration
│   ├── core/                          # Main dev-loop and launch scripts
│   │   ├── launch-all.ps1
│   │   ├── dev-start.js
│   │   └── check-node.js
│   ├── env/                           # Environment sync utilities
│   │   ├── sync-env.js
│   │   └── reset-web3-ids.js
│   └── setup/                         # One-time setup scripts
│
├── package.json                       # Root workspace configuration
├── .gitignore                         # Monorepo-wide ignore rules
└── nexus.bat                          # Unified one-click startup shortcut
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.4 | React meta-framework with Turbopack, App Router, API routes |
| **React** | 19.2.4 | Component library with concurrent features |
| **Ethers.js** | 6.16.0 | Ethereum library for contract interaction & wallet management |
| **TailwindCSS** | 4.x | Utility-first CSS framework |
| **Framer Motion** | 12.38.0 | Animation library for micro-interactions |
| **Firebase** | 12.12.1 | Authentication, Firestore, Storage |
| **Firebase Admin** | 13.8.0 | Server-side token verification & Firestore writes |
| **Sonner** | 2.0.7 | Toast notification system |
| **Razorpay** | 2.9.6 | Fiat payment gateway (INR) |
| **Twilio** | 6.0.0 | SMS notifications & promotions |
| **Nodemailer** | 8.0.6 | Email notifications |
| **Google Generative AI** | 0.24.1 | Gemini-powered AI features |
| **Leaflet** | 1.9.4 | Interactive maps |
| **Lucide React** | 1.8.0 | Icon library |

### Smart Contracts
| Technology | Version | Purpose |
|---|---|---|
| **Solidity** | 0.8.24 | Smart contract language |
| **Hardhat** | 2.22.3 | Development environment, local node, testing |
| **OpenZeppelin** | 4.9.6 | Audited contract libraries (ERC-721, Ownable, ReentrancyGuard) |
| **Hardhat Toolbox** | 6.1.2 | Ethers, Chai, coverage, gas reporter |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Firebase Auth** | User authentication (Email/Password, Google, Phone) |
| **Cloud Firestore** | NoSQL database for events, users, chat |
| **Cloudinary** | Image hosting for event media |
| **Polygon Amoy** | Production testnet (Chain ID: 80002) |
| **Hardhat Node** | Local development blockchain (Chain ID: 31337) |

---

## Smart Contracts

### NexusDonate (`contracts/core/NexusDonate.sol`)
The primary donation contract. Manages campaign lifecycle and records every donation immutably.

| Function | Description |
|---|---|
| `createCampaign(string _firebaseEventId)` | Creates a new on-chain campaign linked to a Firebase event |
| `donate(uint256 _campaignId)` | Records a donation (payable). Emits `DonationMade` event |
| `withdraw(uint256 _campaignId)` | Allows the organizer to withdraw raised funds |
| `getCampaign(uint256 _campaignId)` | Returns campaign details (organizer, totalRaised, active status) |
| `getDonationCount(uint256 _campaignId)` | Returns number of donations for a campaign |
| `getDonation(uint256 _campaignId, uint256 _index)` | Returns individual donation record (donor, amount, timestamp) |
| `campaignCount()` | Returns total number of campaigns created |

**Events:** `CampaignCreated`, `DonationMade`, `FundsWithdrawn`

### NexusEscrow (`contracts/web3/NexusEscrow.sol`)
Milestone-gated escrow system for high-accountability campaigns. Funds are locked and released incrementally as milestones are verified.

| Function | Description |
|---|---|
| `createEscrow(...)` | Creates an escrow with defined milestones and percentage allocations |
| `depositToEscrow(uint256 _escrowId)` | Deposits funds into an escrow (payable) |
| `proposeMilestone(uint256 _escrowId, uint256 _milestoneIndex, string _evidence)` | Organizer submits evidence of milestone completion |
| `approveMilestone(uint256 _escrowId, uint256 _milestoneIndex)` | Admin/DAO approves a milestone, releasing allocated funds |
| `rejectMilestone(uint256 _escrowId, uint256 _milestoneIndex)` | Admin/DAO rejects a milestone submission |
| `refund(uint256 _escrowId)` | Refunds remaining funds if a campaign is cancelled |

**Security:** Built with OpenZeppelin `ReentrancyGuard` to prevent reentrancy attacks.

### NexusReputation (`contracts/web3/NexusReputation.sol`)
Soulbound Token (SBT) system. Non-transferable ERC-721 tokens representing a user's verified impact on the platform.

| Badge Tier | Criteria |
|---|---|
| 🥉 Bronze | First donation or 5 volunteer hours |
| 🥈 Silver | 3 campaigns or 20 volunteer hours |
| 🥇 Gold | 7 campaigns or 35 volunteer hours |
| 💠 Platinum | 15 campaigns or 60 volunteer hours |
| ⚡ Master | 30 campaigns or 100 volunteer hours |
| 💎 Diamond | Exceptional, admin-awarded recognition |

**Key Properties:**
- Tokens are **non-transferable** (Soulbound) — `transfer()` reverts
- Each badge stores: `badgeType`, `recipientAddress`, `mintedAt` timestamp
- Only the contract owner can mint badges (server-side minting via API route)

---

## Getting Started

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | v18.0+ |
| npm | v9.0+ |
| MetaMask | Latest browser extension |
| Git | Latest |

### 1. Clone the Repository
```bash
git clone https://github.com/Cyberclutch146/NexusAid-Web3.git
cd NexusAid-Web3
```

### 2. Install All Dependencies
The root `package.json` uses npm workspaces. A single install covers all packages:
```bash
npm install
```

### 3. Start the Entire Platform
With the new unified launcher, you no longer need to open multiple terminals.
Open a **single terminal** at the project root and run:
```powershell
.\nexus
```
*(Or run `npm start`)*

**What this does automatically:**
1. Starts the local Hardhat blockchain.
2. Deploys `NexusDonate`, `NexusEscrow`, and `NexusReputation` contracts.
3. Synchronizes the new contract addresses into your frontend and backend `.env` files.
4. Resets any stale blockchain data in Firestore.
5. Boots up both the **Backend API** and **Frontend Next.js** servers.

Navigate to **http://localhost:3000** to see the app!

### 6. Configure MetaMask
1. Open MetaMask → **Settings** → **Networks** → **Add Network**.
2. Add the Hardhat network:
   - **Network Name:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** ETH
3. **Import the test account** (Account #0):
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - This account is pre-funded with ~10,000 ETH.

> ⚠️ **Important:** After every Hardhat node restart, you **must** reset MetaMask:
> MetaMask → Settings → Advanced → **Clear activity tab data**

---

## Environment Configuration

Create `frontend/.env.local` with the following variables:

```env
# ─── Firebase (Client-side) ──────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# ─── Firebase Admin (Server-side) ────────────────────────
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com

# ─── Web3 Smart Contracts ────────────────────────────────
NEXT_PUBLIC_DONATE_CONTRACT=0x...deployed_address
NEXT_PUBLIC_ESCROW_CONTRACT=0x...deployed_address
NEXT_PUBLIC_REPUTATION_CONTRACT=0x...deployed_address

# ─── Blockchain RPC ──────────────────────────────────────
# For local development:
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
POLYGON_AMOY_RPC_URL=http://127.0.0.1:8545
DEPLOYER_PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# For Polygon Amoy testnet:
# NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology
# POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
# DEPLOYER_PRIVATE_KEY=your_real_private_key

# ─── Cloudinary ──────────────────────────────────────────
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset

# ─── AI (Gemini) ─────────────────────────────────────────
GEMINI_API_KEY_AI_CHAT_BOT=your_gemini_api_key

# ─── Payments (Razorpay) ─────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx

# ─── Notifications ───────────────────────────────────────
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
EMAIL=your_email@gmail.com
EMAIL_PASS=your_app_password
```

---

## Frontend Pages & Features

| Route | Page | Description |
|---|---|---|
| `/home` | Home | Hero landing page with platform statistics |
| `/feed` | Event Feed | Browse and discover community events and campaigns |
| `/create` | Create Event | AI-assisted event creation wizard with category selection |
| `/event/[id]` | Event Detail | Full event page with crypto + fiat donation panels |
| `/dashboard` | Dashboard | Personal dashboard hub with event management |
| `/dashboard/blockchain` | Blockchain Hub | Wallet identity, balance, SBT badges, contract status, and network info |
| `/dashboard/sentinel` | AI Sentinel | Real-time disaster intelligence monitoring powered by Gemini |
| `/dashboard/event` | Event Manager | Organizer tools for managing created events |
| `/profile` | Profile | User profile, avatar, settings, and wallet linking |
| `/leaderboard` | Leaderboard | Community impact rankings |
| `/about` | About | Platform information and mission |

---

## API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/web3/link-wallet` | POST | Verify EIP-191 signature and link wallet to Firebase user |
| `/api/web3/claim-badge` | POST | Evaluate user metrics and auto-mint eligible SBT badges |
| `/api/web3/mint-badge` | POST | Directly mint a specific badge type to an address |
| `/api/web3/milestones` | GET/POST | Manage escrow milestones (propose, approve, reject) |
| `/api/events` | GET/POST | CRUD operations for events |
| `/api/auth` | POST | Authentication helpers |
| `/api/chat` | POST | Real-time chat messaging |
| `/api/chatbot` | POST | AI-powered chatbot (Gemini) |
| `/api/search` | GET | Full-text event search |
| `/api/sentinel` | GET | Disaster intelligence data feed |
| `/api/promote` | POST | Email/SMS campaign promotion |
| `/api/sms` | POST | Twilio SMS gateway |
| `/api/generate-description` | POST | AI event description generation |
| `/api/generate-image` | POST | AI image generation |
| `/api/create-payment-order` | POST | Razorpay payment order creation |

---

## MetaMask & Local Development

### Network Auto-Detection
The frontend automatically detects whether you are running locally or on a deployed environment:
- **`localhost`** → Switches MetaMask to Hardhat (Chain ID: 31337)
- **Production** → Switches MetaMask to Polygon Amoy (Chain ID: 80002)

### Common Issues & Fixes

| Problem | Solution |
|---|---|
| "Insufficient funds" after node restart | Reset MetaMask: Settings → Advanced → **Clear activity tab data** |
| "Nonce too high" error | Same fix: Clear activity tab data in MetaMask |
| `NETWORK_ERROR: network changed` | The app auto-reloads on chain change. If stuck, hard-refresh (`Ctrl+F5`) |
| `BAD_DATA` from contract calls | Ensure contracts are deployed and addresses in `.env.local` match |
| Balance shows 0 despite having ETH | MetaMask may be on the wrong network. Check the network dropdown |

### Verifying Node Status
Run the diagnostic script from the repo root:
```bash
node scripts/core/check-node.js
```
Expected output:
```
Balance of 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266: 9999.99 ETH
Connected to Chain ID: 31337
```

---

## Deployment Targets

| Target | Network | Chain ID | RPC URL | Currency |
|---|---|---|---|---|
| **Local Development** | Hardhat | 31337 | `http://127.0.0.1:8545` | ETH (test) |
| **Testnet** | Polygon Amoy | 80002 | `https://rpc-amoy.polygon.technology` | MATIC (test) |
| **Production** *(planned)* | Polygon PoS | 137 | `https://polygon-rpc.com` | MATIC |

---

## Available Scripts

| Command | Description |
|---|---|
| `npm install` | Install all workspace dependencies |
| `npm start` | **[RECOMMENDED]** Start everything (Blockchain, Backend, Frontend) in a single unified terminal |
| `npm run launch` | Start everything but open separate PowerShell windows for each service |
| `npm run dev:frontend` | Start just the Next.js frontend |
| `npm run dev:backend` | Start just the Express backend |
| `npm run sync-env` | Manually sync `.env` files with deployed contract addresses |
| `cd contracts && npx hardhat node` | Manually start local blockchain |
| `node scripts/core/check-node.js` | Verify local node connectivity and balance |

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes with clear, descriptive messages.
4. Push to your fork and open a Pull Request.

Please refer to:
- **[DEPLOY_GUIDE.md](./documentation/DEPLOY_GUIDE.md)** — 🆕 **Complete beginner's guide.** Zero-to-running in 15 minutes, no Web3 experience required.
- **[PROJECT_STATUS.md](./documentation/PROJECT_STATUS.md)** — Current blockers, recent achievements, and immediate next steps.
- **[ROADMAP.md](./documentation/ROADMAP.md)** — Strategic 42-feature roadmap covering Account Abstraction, ZK-KYC, DAO governance, and more.

---

## License

This project is licensed under the **MIT License**.

---

<div align="center">

**Built with 🔥 by the NexusAid Team**

*Transparency isn't optional — it's the foundation.*

</div>
