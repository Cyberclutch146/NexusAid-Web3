# 🏗️ NexusAid — Architecture & Design Decisions

> **Last Updated:** May 13, 2026

This document provides a deep technical reference for the NexusAid platform architecture, data flows, and key design decisions.

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          NexusAid Platform                               │
├──────────────┬──────────────┬────────────────┬──────────────────────────┤
│   frontend/  │   backend/   │   contracts/   │     documentation/       │
│  Next.js 16  │  Express     │   Hardhat +    │   README, Roadmap        │
│  React 19    │  Event       │   Solidity     │   Status, Guides         │
│  Ethers v6   │  Indexer     │   0.8.24       │   Architecture           │
│  TailwindCSS │  Firebase    │   OpenZeppelin │   Implementation Plans   │
│  v4          │  Admin SDK   │   4.9.6        │                          │
├──────────────┴──────────────┴────────────────┴──────────────────────────┤
│                    npm workspaces (root package.json)                    │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User (Browser)
  │
  ├── MetaMask ──► Smart Contracts (Hardhat/Polygon)
  │                     │
  │                     └──► Backend Indexer ──► Firestore (real-time sync)
  │
  ├── Frontend (Next.js) ──► API Routes (serverless)
  │                               │
  │                               ├── /api/web3/*        ──► Blockchain (Ethers.js)
  │                               ├── /api/verify-payment ──► Razorpay (signature check)
  │                               ├── /api/approve-donation ──► Firestore (Admin SDK)
  │                               ├── /api/ipfs/upload    ──► Pinata (IPFS)
  │                               ├── /api/chatbot        ──► Gemini AI
  │                               ├── /api/sentinel       ──► USGS/NOAA feeds
  │                               └── /api/promote        ──► Nodemailer/Twilio
  │
  └── Firebase SDK ──► Firestore (reads, real-time listeners)
                   ──► Firebase Auth (authentication)
```

---

## 2. Data Ownership Model

| Data Type | Primary Store | Secondary Store | Rationale |
|---|---|---|---|
| User profiles | Firebase Firestore | — | Mutable, real-time subscriptions needed |
| Wallet mapping | Firebase Firestore | Verified on-chain (EIP-191) | Firebase for fast lookup, chain for verification |
| Event metadata | Firebase Firestore | IPFS (optional, via Pinata) | Speed for reads; IPFS for permanent backup |
| Donations (crypto) | Blockchain (NexusDonate) | Firestore (via backend indexer) | Chain is source of truth; Firestore for fast queries |
| Donations (fiat) | Firestore (via Admin SDK) | — | Server-verified Razorpay payments |
| Donations (cash) | Firestore (via Admin SDK) | — | Admin-approved offline claims |
| SBT Badges | Blockchain (NexusReputation) | Firestore (via backend indexer) | Non-transferable, permanent, unforgeable |
| Escrow state | Blockchain (NexusEscrow) | Firestore (via backend indexer) | Trustless, milestone-gated fund release |
| Chat messages | Firebase Firestore | — | Real-time, high volume, no trust requirement |
| Sentinel alerts | Firebase Firestore | — | Speed critical, sourced from external APIs |
| Leaderboard | Firebase Firestore | — | Aggregated from on-chain + off-chain data |

---

## 3. Donation Flow Architecture

### 3a. Razorpay (Fiat) Donation Flow

```
1. User clicks "Donate with Razorpay" on event page
2. Frontend calls POST /api/create-payment-order (creates Razorpay order)
3. Razorpay checkout opens in browser
4. User completes payment
5. Frontend receives payment callback with payment_id, order_id, signature
6. Frontend calls POST /api/verify-payment with the callback data
7. Server verifies Razorpay signature using HMAC-SHA256
8. Server writes donation record to:
   - events/{eventId}/donations/{id}   (via Admin SDK)
   - users/{userId}/donations/{id}     (via Admin SDK)
9. Server atomically increments events/{eventId}/needs.funds.current
10. Server sends donation receipt email (planned)
```

### 3b. Crypto (ETH/MATIC) Donation Flow

```
1. User clicks "Donate with Crypto" on event page
2. DonateWithCrypto component checks wallet connection and network
3. Auto-switches MetaMask to correct network if needed
4. User selects amount and clicks donate
5. Frontend calls NexusDonate.donate(campaignId) with ETH value
6. MetaMask prompts user to confirm transaction
7. Transaction is mined on-chain
8. Backend indexer detects DonationMade event
9. Indexer writes donation record to Firestore
10. Frontend donation service also records in user subcollection
```

### 3c. Offline (Cash) Donation Flow

```
1. User clicks "Submit Donation Claim" on event page
2. User fills reference number, amount, notes
3. Frontend writes to events/{eventId}/pendingDonations/{id} (status: 'pending')
4. Admin/organizer sees pending donation in dashboard
5. Admin clicks Approve → POST /api/approve-donation
6. Server (Admin SDK) writes to events/{eventId}/donations/{id}
7. Server (Admin SDK) writes to users/{userId}/donations/{id}
8. Server updates pending donation status to 'approved'
9. Server increments event fund counter
```

---

## 4. Security Architecture

### Firestore Rules Strategy

```
Global fallback:     Authenticated reads/writes (to be tightened)
events/{id}:         Public reads, authenticated writes
  /donations:        READ-ONLY from client; writes via Admin SDK only
  /pendingDonations: Authenticated create/read/update; no delete
users/{uid}:         Owner-only access
  /donations:        READ-ONLY from client; writes via Admin SDK only
```

### API Route Authentication

All sensitive API routes verify Firebase ID tokens:
```typescript
const authHeader = request.headers.get('authorization');
const token = authHeader?.split('Bearer ')[1];
const decodedToken = await adminAuth.verifyIdToken(token);
```

### Smart Contract Security

| Mechanism | Contract | Purpose |
|---|---|---|
| `ReentrancyGuard` | NexusEscrow | Prevents reentrancy attacks on fund-moving functions |
| `Ownable` | NexusReputation | Only contract owner can mint badges |
| Soulbound override | NexusReputation | `_update()` reverts on all transfers (non-transferable) |
| Checks-effects-interactions | NexusEscrow | Prevents state manipulation during external calls |
| Solidity 0.8.24 | All | Built-in integer overflow/underflow protection |

---

## 5. Frontend Component Architecture

```
src/
├── app/                     # Next.js App Router
│   ├── (app)/               # Authenticated routes (wrapped in auth layout)
│   │   └── layout.tsx       # Auth guard + Navbar + Sidebar
│   ├── (marketing)/         # Public pages (login, register, landing)
│   └── api/                 # Serverless API routes
│
├── components/
│   ├── web3/                # Blockchain-specific UI
│   ├── events/              # Event-related UI (cards, donations, volunteers)
│   ├── layout/              # Shell components (Navbar, Sidebar)
│   ├── ui/                  # Design system primitives
│   ├── ai/                  # AI-powered components
│   └── map/                 # Geospatial components (Leaflet)
│
├── hooks/                   # Custom React hooks
│   ├── useWallet.ts         # MetaMask connection & state
│   ├── useCreateCampaign.ts # On-chain campaign creation
│   └── useIPFSUpload.ts     # Pinata IPFS file upload
│
├── lib/                     # Shared utilities & SDK clients
│   ├── web3/                # Smart contract bindings (ABIs + helpers)
│   ├── ipfs/                # Pinata upload helpers
│   ├── payments/            # Razorpay client config
│   ├── firebase.ts          # Client-side Firebase init
│   └── firebase-admin.ts    # Server-side Firebase Admin init
│
├── services/                # Business logic layer
│   ├── donationService.ts   # Unified donation recording
│   ├── eventService.ts      # Event CRUD
│   └── ...                  # 13 service modules total
│
└── context/                 # React Context providers
    ├── AuthContext.tsx       # Firebase auth state
    └── ThemeProvider.tsx     # Dark/light mode
```

---

## 6. Backend Indexer Architecture

The backend is a lightweight Express server that bridges blockchain events to Firestore.

```
backend/src/
├── index.js              # Express app + health check + listener bootstrap
├── config/
│   ├── contracts.js      # Contract ABIs, addresses, JsonRpcProvider
│   └── firebase.js       # Firebase Admin SDK initialization
└── listeners/
    ├── donateListener.js      # Listens for DonationMade, CampaignCreated, FundsWithdrawn
    ├── escrowListener.js      # Listens for DonationReceived, MilestoneApproved, RefundIssued
    └── reputationListener.js  # Listens for BadgeMinted
```

**How it works:**
1. Each listener creates an `ethers.Contract` instance with the contract's ABI
2. Calls `contract.on("EventName", callback)` to subscribe to on-chain events
3. When an event fires, the callback writes a structured document to Firestore
4. The health check endpoint (`GET /health`) returns `{ status: 'ok' }`

---

## 7. Key Design Decisions

### Why Hybrid (Web2 + Web3)

| Decision | Rationale |
|---|---|
| **Keep Firebase for real-time** | Firestore real-time listeners power chat, notifications, Sentinel alerts. No blockchain can match sub-second push updates at this cost. |
| **Keep Firebase Auth as primary** | 95%+ of disaster relief volunteers won't have crypto wallets. Email/Google login must remain frictionless. |
| **Blockchain only for trust-critical paths** | Donations need transparency + escrow. Reputation needs immutability. Everything else is better served by Firebase. |
| **Polygon over Ethereum** | $0.01 vs $5-50 per tx. Disaster relief users shouldn't pay gas fees. |
| **SBTs over transferable NFTs** | Reputation should not be tradeable. A "100 hours volunteered" badge you can buy defeats the purpose. |
| **Custom `useWallet` over wagmi/RainbowKit** | Simpler, lighter, no additional dependencies. Sufficient for MetaMask-only support. |
| **Admin SDK for donation writes** | Prevents client-side manipulation of donation records. Server verifies payments before recording. |

### What Stays Web2

| Component | Why |
|---|---|
| Chat messages | Real-time, high volume, no trust requirement |
| Sentinel alerts | Speed critical, sourced from external APIs |
| User profiles | Mutable data, real-time subscriptions needed |
| Event search/RAG | AI inference doesn't belong on-chain |
| Notifications | Push delivery, no permanence needed |
| Bulk promotions | Communication channels, not data ownership |

---

## 8. Environment Variables Reference

### Frontend (`frontend/.env.local`)

| Variable | Purpose | Public? |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client SDK config | Yes |
| `FIREBASE_PROJECT_ID` | Firebase Admin SDK | No |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK | No |
| `NEXT_PUBLIC_DONATE_CONTRACT` | NexusDonate address | Yes |
| `NEXT_PUBLIC_ESCROW_CONTRACT` | NexusEscrow address | Yes |
| `NEXT_PUBLIC_REPUTATION_CONTRACT` | NexusReputation address | Yes |
| `NEXT_PUBLIC_RPC_URL` | Blockchain RPC endpoint | Yes |
| `DEPLOYER_PRIVATE_KEY` | Server-side contract interactions | No |
| `PINATA_API_KEY` / `PINATA_SECRET_KEY` | IPFS uploads | No |
| `NEXT_PUBLIC_PINATA_GATEWAY_URL` | IPFS gateway for reads | Yes |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment processing | No |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Client-side Razorpay | Yes |
| `GEMINI_API_KEY_AI_CHAT_BOT` | Gemini AI features | No |
| `TWILIO_*` | SMS notifications | No |
| `EMAIL` / `EMAIL_PASS` | Nodemailer SMTP | No |
| `NEXT_PUBLIC_CLOUDINARY_*` | Image hosting | Yes |

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `RPC_URL` | Blockchain RPC endpoint |
| `PORT` | Server port (default: 4000) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON |
| `DONATE_CONTRACT_ADDRESS` | NexusDonate address |
| `ESCROW_CONTRACT_ADDRESS` | NexusEscrow address |
| `REPUTATION_CONTRACT_ADDRESS` | NexusReputation address |

---

*For setup instructions, see [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md). For the feature roadmap, see [ROADMAP.md](./ROADMAP.md).*
