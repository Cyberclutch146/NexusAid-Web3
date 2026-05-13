# NexusAid - Project Status & Roadmap

This document outlines the current state of the NexusAid project, tracking completed milestones and remaining high-priority tasks.

> **Last Updated:** May 13, 2026

---

## ✅ Completed Milestones

### 🛡️ Security & Infrastructure
- [x] **Firebase Admin SDK Integration**: Established a secure server-side bridge (`src/lib/firebase-admin.ts`).
- [x] **Secure Event Creation**: Migrated event creation to `/api/events/create` for server-side validation and geocoding.
- [x] **Atomic Volunteer Signups**: Implemented `/api/events/join` with transactions to ensure data consistency across events and user profiles.
- [x] **Razorpay Payment Verification**: Server-side payment signature verification via `/api/verify-payment`.
- [x] **Donation Approval Workflow**: Admin-only authenticated route `/api/approve-donation` for offline donation verification using Admin SDK.
- [x] **Firestore Security Rules**: Write-once enforcement on donation records; pending donations accessible to authenticated users only.
- [x] **Badge Minting Authentication**: `/api/web3/claim-badge` requires Firebase `verifyIdToken`.

### 🔗 Blockchain & Web3
- [x] **Smart Contract Suite**: Three contracts deployed — `NexusDonate`, `NexusEscrow`, `NexusReputation` (Solidity 0.8.24).
- [x] **MetaMask Wallet Integration**: Full `useWallet` hook with auto-detection, EIP-191 linking, and network auto-switching.
- [x] **Soulbound Token Badges**: Six-tier badge hierarchy (Bronze → Diamond) with server-side minting.
- [x] **Blockchain Hub Dashboard**: Bento-grid showing wallet identity, balance, badges, network info, and contract status.
- [x] **On-Chain Donation Flow**: End-to-end crypto donations via `DonateWithCrypto` component with network guards.
- [x] **Backend Event Indexer**: Express listeners subscribing to `DonationMade`, `CampaignCreated`, `BadgeMinted`, `MilestoneApproved` events with real-time Firestore sync.
- [x] **IPFS Integration**: Pinata upload helper, API route, and `useIPFSUpload` hook.
- [x] **Campaign Creation Hook**: `useCreateCampaign` for creating on-chain campaigns from the frontend.

### 💰 Donation Tracking
- [x] **Unified Donation Service**: `donationService.ts` supporting Razorpay (fiat), crypto (ETH/MATIC), and cash donations.
- [x] **Dual-Write Records**: Donations recorded in both `events/{id}/donations` and `users/{uid}/donations`.
- [x] **Receipt ID Generation**: Human-readable receipts (`NXA-YYYY-XXXXXXXX`).
- [x] **Pending Donation System**: Users submit offline donation claims; admins approve via authenticated API.
- [x] **Expenditure Tracking**: Service methods and dashboard UI tabs for tracking event expenditures.
- [x] **On-Chain Badge Criteria**: Badge milestones updated from campaign counts to MATIC donation thresholds.

### 🧠 AI & Intelligence
- [x] **RAG Pattern Implementation**: The AI assistant uses semantic retrieval (`searchService.ts`) to provide context-aware event recommendations.
- [x] **AI Function Calling**: Integrated Gemini functions for navigation and event signups directly from the chat interface.
- [x] **AI Sentinel Dashboard**: Real-time disaster intelligence monitoring with USGS/NOAA feeds.
- [x] **AI Event Description Generator**: Gemini-powered auto-generation of event descriptions.

### 🗺️ Dashboard & UI
- [x] **Sentinel Dashboard Aesthetics**: Refined dark mode and glassmorphism styling for the live safety monitoring map.
- [x] **Premium Components**: High-fidelity UI components for event cards, search, AI chat, donation panels.
- [x] **Offline/PWA Support**: Workbox service workers, offline fallback page, and caching strategies.
- [x] **Dark Mode**: Full theme support via `next-themes`.
- [x] **Skill Match Banner**: `SkillMatchBanner.tsx` for intelligent volunteer-event matching.
- [x] **Volunteer Leaderboard**: Community impact rankings.

---

## 🛠️ Remaining Tasks (TODO)

### 1. 🔐 Security Hardening (High Priority)
- [ ] **Migrate Remaining Client Writes**: Move these operations to API routes:
    - [ ] **Chat Messages**: Move `chatService.ts` writes to a new `/api/chat/send` route.
    - [ ] **Event Updates**: Move `updateEvent` and `deleteEvent` to `/api/events/[id]` routes.
- [ ] **Tighten Firestore Rules**: Once all writes are migrated, update `firestore.rules` to remove the global fallback `allow read, write: if request.auth != null`.

### 2. 🔗 Blockchain Hardening
- [ ] **End-to-End Escrow Testing**: Wire `MilestoneTracker` to actual `NexusEscrow` contract calls and verify the full lifecycle.
- [ ] **Smart Contract Unit Tests**: Write comprehensive Hardhat test suites for all three contracts.
- [ ] **Polygon Amoy Deployment**: Deploy contracts to public testnet and update environment configuration.
- [ ] **Upgradeable Contracts**: Implement UUPS proxy pattern before any mainnet deployment.

### 3. 📧 Notifications
- [ ] **Donation Receipt Emails**: Wire `emailService.ts` to send automated receipts after payment verification.
- [ ] **Digital Ticket Flow**: Verify QR codes are correctly generated and emailed upon event registration.

### 4. 🧪 Testing & Quality Assurance
- [ ] **E2E Testing**: Verify the full user journey: Register → Find Event → Donate (fiat + crypto) → Receive Receipt → Check Badge.
- [ ] **Bulk Promotions**: Stress-test the CSV/Excel parser with larger contact lists (100+ entries).
- [ ] **Error Handling**: Implement more robust error boundaries for Sentinel real-time feeds.

---

## 📅 Future Roadmap
- [ ] **Account Abstraction (ERC-4337)**: Smart contract wallets with social login.
- [ ] **Gasless Transactions**: Paymaster integration for $0 gas fees.
- [ ] **The Graph Integration**: Custom subgraphs for high-performance blockchain queries.
- [ ] **DAO Governance**: Decentralized milestone approvals through donor voting.
- [ ] **Multi-Language Support**: AI-driven translation for regional relief efforts.

---

*See [ROADMAP.md](../ROADMAP.md) for the full 42-feature strategic roadmap.*
