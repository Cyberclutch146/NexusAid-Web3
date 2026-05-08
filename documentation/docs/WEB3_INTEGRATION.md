# NexusAid: Web2 + Web3 Hybrid Integration Plan

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────┐  │
│  │ Firebase  │  │ Wallet   │  │ Event UI  │  │ Sentinel Map  │  │
│  │ Auth      │  │ Connect  │  │ + Donate  │  │ + Alerts      │  │
│  └─────┬────┘  └────┬─────┘  └─────┬─────┘  └───────────────┘  │
│        │            │              │                             │
│  ┌─────▼────────────▼──────────────▼─────────────────────────┐  │
│  │              AuthContext + WalletContext                    │  │
│  │  (Firebase user ↔ wallet mapping stored in Firestore)      │  │
│  └────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  API Routes     │
                   │  /api/events/*  │
                   │  /api/web3/*    │
                   │  /api/ipfs/*    │
                   └───┬────┬────┬──┘
                       │    │    │
          ┌────────────┘    │    └────────────┐
          ▼                 ▼                  ▼
   ┌──────────┐    ┌──────────────┐    ┌───────────┐
   │ Firebase │    │  Polygon     │    │   IPFS    │
   │ Firestore│    │  Blockchain  │    │  (Pinata) │
   │ Auth     │    │  Contracts   │    │           │
   └──────────┘    └──────────────┘    └───────────┘
```

### Data Flow Rules

| Data Type | Firebase | Blockchain | IPFS |
|-----------|----------|------------|------|
| User profiles | ✅ Primary | Wallet mapping only | — |
| Event metadata | ✅ Primary | Event hash for integrity | Full metadata backup |
| Donations | Amount cache | ✅ Primary (escrow) | Receipt proof |
| Chat messages | ✅ Primary | — | — |
| Sentinel alerts | ✅ Primary | — | — |
| Volunteer badges | Display cache | ✅ Primary (SBT) | Badge metadata |
| Reputation scores | ✅ Read cache | ✅ Source of truth | — |
| Goods pledges | ✅ Primary | Pledge hash | — |

---

## 2. Smart Contract Design

### 2.1 Contracts Required

**Contract 1: `NexusEscrow.sol`** — Donation escrow with milestone release

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract NexusEscrow is ReentrancyGuard, AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum CampaignStatus { Active, Completed, Refunded }

    struct Campaign {
        string firebaseEventId;     // Links to Firestore event doc
        address organizer;
        uint256 goalAmount;
        uint256 currentAmount;
        uint256 releasedAmount;
        CampaignStatus status;
        string metadataIpfsHash;    // IPFS CID of event metadata snapshot
        uint256 createdAt;
        uint256 deadline;
    }

    struct Milestone {
        string description;
        uint256 percentage;         // Percentage of funds to release (basis points)
        bool verified;
        bool released;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Milestone[]) public milestones;
    mapping(uint256 => mapping(address => uint256)) public donations;
    uint256 public campaignCount;

    event CampaignCreated(uint256 indexed id, string firebaseEventId, address organizer);
    event DonationReceived(uint256 indexed id, address donor, uint256 amount);
    event MilestoneVerified(uint256 indexed id, uint256 milestoneIndex);
    event FundsReleased(uint256 indexed id, uint256 amount);
    event RefundIssued(uint256 indexed id, address donor, uint256 amount);

    function createCampaign(
        string calldata _firebaseEventId,
        uint256 _goalAmount,
        uint256 _deadline,
        string calldata _ipfsHash,
        string[] calldata _milestoneDescs,
        uint256[] calldata _milestonePercentages
    ) external returns (uint256) {
        require(_milestoneDescs.length == _milestonePercentages.length, "Mismatch");
        uint256 totalPct;
        for (uint i = 0; i < _milestonePercentages.length; i++) {
            totalPct += _milestonePercentages[i];
        }
        require(totalPct == 10000, "Must total 100%"); // basis points

        uint256 id = campaignCount++;
        campaigns[id] = Campaign({
            firebaseEventId: _firebaseEventId,
            organizer: msg.sender,
            goalAmount: _goalAmount,
            currentAmount: 0,
            releasedAmount: 0,
            status: CampaignStatus.Active,
            metadataIpfsHash: _ipfsHash,
            createdAt: block.timestamp,
            deadline: _deadline
        });

        for (uint i = 0; i < _milestoneDescs.length; i++) {
            milestones[id].push(Milestone({
                description: _milestoneDescs[i],
                percentage: _milestonePercentages[i],
                verified: false,
                released: false
            }));
        }

        emit CampaignCreated(id, _firebaseEventId, msg.sender);
        return id;
    }

    function donate(uint256 _campaignId) external payable nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        require(c.status == CampaignStatus.Active, "Not active");
        require(block.timestamp < c.deadline, "Expired");

        c.currentAmount += msg.value;
        donations[_campaignId][msg.sender] += msg.value;

        emit DonationReceived(_campaignId, msg.sender, msg.value);
    }

    function verifyMilestone(uint256 _campaignId, uint256 _index)
        external onlyRole(VERIFIER_ROLE)
    {
        milestones[_campaignId][_index].verified = true;
        emit MilestoneVerified(_campaignId, _index);
    }

    function releaseFunds(uint256 _campaignId, uint256 _index)
        external nonReentrant
    {
        Campaign storage c = campaigns[_campaignId];
        Milestone storage m = milestones[_campaignId][_index];
        require(m.verified && !m.released, "Not ready");

        uint256 amount = (c.currentAmount * m.percentage) / 10000;
        m.released = true;
        c.releasedAmount += amount;

        (bool ok, ) = payable(c.organizer).call{value: amount}("");
        require(ok, "Transfer failed");
        emit FundsReleased(_campaignId, amount);
    }

    function refund(uint256 _campaignId) external nonReentrant {
        Campaign storage c = campaigns[_campaignId];
        require(block.timestamp > c.deadline, "Not expired");
        require(c.releasedAmount == 0, "Funds already released");

        uint256 amt = donations[_campaignId][msg.sender];
        require(amt > 0, "No donation");

        donations[_campaignId][msg.sender] = 0;
        c.status = CampaignStatus.Refunded;

        (bool ok, ) = payable(msg.sender).call{value: amt}("");
        require(ok, "Refund failed");
        emit RefundIssued(_campaignId, msg.sender, amt);
    }
}
```

**Contract 2: `NexusReputation.sol`** — Soulbound token (SBT) for reputation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NexusReputation is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    enum BadgeType { Volunteer, Donor, Organizer, FirstResponder, MentorHero }

    struct Badge {
        BadgeType badgeType;
        string firebaseUserId;
        string metadataIpfsHash;
        uint256 issuedAt;
        uint256 impactScore;
    }

    mapping(uint256 => Badge) public badges;
    mapping(string => uint256[]) public userBadges; // firebaseUserId => tokenIds

    event BadgeMinted(uint256 indexed tokenId, string firebaseUserId, BadgeType badgeType);

    constructor() ERC721("NexusAid Reputation", "NXREP") Ownable(msg.sender) {}

    function mintBadge(
        address to,
        string calldata firebaseUserId,
        BadgeType badgeType,
        string calldata ipfsHash,
        uint256 impactScore
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);

        badges[tokenId] = Badge({
            badgeType: badgeType,
            firebaseUserId: firebaseUserId,
            metadataIpfsHash: ipfsHash,
            issuedAt: block.timestamp,
            impactScore: impactScore
        });

        userBadges[firebaseUserId].push(tokenId);
        emit BadgeMinted(tokenId, firebaseUserId, badgeType);
        return tokenId;
    }

    // Soulbound: override transfer to prevent it
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0), "Soulbound: non-transferable");
        return super._update(to, tokenId, auth);
    }

    function getUserBadges(string calldata firebaseUserId)
        external view returns (uint256[] memory)
    {
        return userBadges[firebaseUserId];
    }
}
```

### 2.2 Security Considerations

- **Reentrancy**: `ReentrancyGuard` on all fund-moving functions
- **Pull-over-push**: Refunds use checks-effects-interactions
- **Access control**: Only `VERIFIER_ROLE` can verify milestones (assigned to backend wallet)
- **SBT non-transferable**: Transfer override blocks all post-mint transfers
- **Deadline enforcement**: Donations blocked after campaign deadline
- **Integer overflow**: Solidity 0.8+ has built-in overflow checks

---

## 3. Identity Layer

### 3.1 Wallet Integration Flow

```
User clicks "Connect Wallet"
        │
        ▼
  WalletConnect / MetaMask modal
        │
        ▼
  Get wallet address (0x...)
        │
  ┌─────▼──────────────────────────────────┐
  │ Is user logged into Firebase?           │
  │   YES → Link wallet to Firestore doc   │
  │   NO  → Prompt Firebase login first    │
  └────────────────────────────────────────┘
        │
        ▼
  POST /api/web3/link-wallet
  {firebaseUid, walletAddress, signature}
        │
        ▼
  Server verifies signature (ethers.verifyMessage)
  Stores in Firestore: users/{uid}/walletAddress
```

### 3.2 Implementation

```typescript
// src/context/WalletContext.tsx
'use client';
import { createContext, useContext, useState } from 'react';
import { BrowserProvider } from 'ethers';

interface WalletContextType {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  provider: BrowserProvider | null;
}

export const WalletContext = createContext<WalletContextType>({} as WalletContextType);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const connect = async () => {
    if (!window.ethereum) throw new Error('No wallet found');
    const prov = new BrowserProvider(window.ethereum);
    const signer = await prov.getSigner();
    const addr = await signer.getAddress();
    setProvider(prov);
    setAddress(addr);
  };

  const disconnect = () => { setAddress(null); setProvider(null); };

  return (
    <WalletContext.Provider value={{ address, connect, disconnect, provider }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
```

### 3.3 Non-Crypto Users

- Wallet connection is **optional** — Firebase Auth remains primary
- Razorpay stays for fiat donations; smart contract is an alternative
- UI shows "Donate with Crypto" as a secondary button alongside Razorpay
- Users without wallets see no Web3 UI elements (progressive disclosure)

---

## 4. NFT / Reputation System

### 4.1 Token Type Decision

| Achievement | Token Type | Reason |
|-------------|-----------|--------|
| Event attendance | Soulbound (SBT) | Proves participation, non-tradeable |
| Donation milestone | Soulbound (SBT) | Reputation, not speculative |
| Organizer verified | Soulbound (SBT) | Trust credential |
| Special campaign completion | Transferable NFT | Commemorative, shareable |

### 4.2 Metadata Structure (stored on IPFS)

```json
{
  "name": "NexusAid Volunteer Badge - Gold",
  "description": "Awarded for 100+ volunteer hours on NexusAid",
  "image": "ipfs://Qm.../badge-gold.png",
  "attributes": [
    { "trait_type": "Badge Type", "value": "Volunteer" },
    { "trait_type": "Impact Score", "value": 850 },
    { "trait_type": "Hours", "value": 120 },
    { "trait_type": "Events Attended", "value": 15 },
    { "trait_type": "Platform", "value": "NexusAid" }
  ],
  "external_url": "https://nexusaid.app/profile/{userId}"
}
```

### 4.3 Minting Triggers

| Trigger | Threshold | Badge |
|---------|-----------|-------|
| First event volunteered | 1 event | "First Responder" SBT |
| 10 events completed | 10 events | "Community Pillar" SBT |
| 50+ volunteer hours | 50 hours | "Silver Volunteer" SBT |
| 100+ volunteer hours | 100 hours | "Gold Volunteer" SBT |
| First donation (crypto) | Any amount | "Crypto Donor" SBT |
| $500+ total donated | $500 | "Impact Patron" SBT |
| Organized 5+ events | 5 events | "Verified Organizer" SBT |

### 4.4 Leaderboard Mapping

```
Firestore impactScore (existing) → cached display score
On-chain SBT count + impactScore attributes → verifiable score
API route /api/web3/reputation syncs on badge mint events
```

---

## 5. Storage Strategy

### 5.1 What Goes Where

| Layer | Data | Rationale |
|-------|------|-----------|
| **Firebase** | User profiles, chat, notifications, sentinel alerts, real-time event data | Speed, real-time listeners, existing infrastructure |
| **Blockchain** | Donation transactions, SBT badges, campaign escrow state, event integrity hashes | Trust, transparency, immutability |
| **IPFS (Pinata)** | Event metadata snapshots, badge images/metadata, donation receipts, campaign proof docs | Permanent decentralized storage, low cost |

### 5.2 Hashing Strategy

```typescript
// When creating an event via /api/events/create:
import { keccak256, toUtf8Bytes } from 'ethers';

const eventSnapshot = {
  title: data.title,
  organizerId: data.organizerId,
  goalAmount: data.needs?.funds?.goal,
  createdAt: new Date().toISOString()
};

const integrityHash = keccak256(toUtf8Bytes(JSON.stringify(eventSnapshot)));
// Store hash in Firestore alongside event doc
// Later: compare hash to verify event wasn't tampered with
```

### 5.3 Cost Optimization

- **Polygon PoS**: ~$0.01 per transaction (vs $5-50 on Ethereum)
- **IPFS via Pinata**: Free tier = 500 files, 1GB — sufficient for MVP
- **Batch minting**: Queue SBT mints and batch weekly to reduce gas
- **Event hashing**: Hash stored in Firestore first, only anchored on-chain periodically

---

## 6. API Layer Refactor

### 6.1 New API Routes

```
src/app/api/
├── web3/
│   ├── link-wallet/route.ts      # Link wallet ↔ Firebase user
│   ├── donate/route.ts           # Initiate on-chain donation
│   ├── campaign/create/route.ts  # Create escrow campaign
│   ├── campaign/verify/route.ts  # Verify milestone (admin)
│   ├── reputation/mint/route.ts  # Mint SBT badge
│   └── reputation/check/route.ts # Check user's on-chain badges
├── ipfs/
│   ├── pin/route.ts              # Pin metadata to IPFS
│   └── verify/route.ts           # Verify IPFS hash integrity
```

### 6.2 Example: Donation API Flow

```typescript
// src/app/api/web3/donate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ethers } from 'ethers';

const ESCROW_ABI = [...]; // ABI from compiled contract
const ESCROW_ADDRESS = process.env.NEXUS_ESCROW_ADDRESS!;

export async function POST(req: NextRequest) {
  const { firebaseEventId, campaignId, txHash, donorWallet, amount } = await req.json();

  // 1. Verify the transaction on-chain
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const receipt = await provider.getTransactionReceipt(txHash);

  if (!receipt || receipt.status !== 1) {
    return NextResponse.json({ error: 'Transaction not confirmed' }, { status: 400 });
  }

  // 2. Decode the DonationReceived event from logs
  const iface = new ethers.Interface(ESCROW_ABI);
  const donationLog = receipt.logs.find(log => {
    try { return iface.parseLog(log)?.name === 'DonationReceived'; }
    catch { return false; }
  });

  if (!donationLog) {
    return NextResponse.json({ error: 'No donation event found' }, { status: 400 });
  }

  // 3. Update Firebase with verified on-chain donation
  const eventRef = adminDb!.collection('events').doc(firebaseEventId);
  await adminDb!.runTransaction(async (tx) => {
    const snap = await tx.get(eventRef);
    const current = snap.data()?.needs?.funds?.current ?? 0;
    tx.update(eventRef, {
      'needs.funds.current': current + amount,
      updatedAt: new Date()
    });
  });

  // 4. Log donation with blockchain proof
  await eventRef.collection('donations').add({
    donorWallet,
    amount,
    txHash,
    chainId: 137, // Polygon
    verified: true,
    createdAt: new Date()
  });

  // 5. Check if user qualifies for a badge (async, non-blocking)
  checkAndMintBadge(donorWallet, amount).catch(console.error);

  return NextResponse.json({ success: true, txHash });
}
```

### 6.3 Existing Route Modifications

| Existing Route | Change |
|---------------|--------|
| `/api/events/create` | Add optional `ipfsHash` field, compute integrity hash |
| `/api/events/join` | After join, check badge eligibility |
| `/api/events/scan` | After attendance confirm, trigger SBT mint check |
| `/api/create-payment-order` | Keep as-is (Razorpay fiat path unchanged) |

---

## 7. Step-by-Step Implementation Roadmap

### Phase 1: MVP (Weeks 1-3)

| Task | Dependencies | Tools |
|------|-------------|-------|
| Install ethers.js v6, wagmi v2, @rainbow-me/rainbowkit | npm | `ethers`, `wagmi`, `@tanstack/react-query` |
| Create `WalletContext.tsx` | None | ethers.js |
| Create `/api/web3/link-wallet` | Firebase Admin SDK | ethers.verifyMessage |
| Add `walletAddress` field to `UserProfile` type | types/index.ts | TypeScript |
| Write `NexusEscrow.sol` | None | Solidity 0.8.20, OpenZeppelin 5.x |
| Write Hardhat config + deploy script | Solidity contract | Hardhat, Polygon Mumbai testnet |
| Deploy to Polygon Amoy testnet | Contract compiled | Hardhat, Alchemy RPC |
| Create `/api/web3/donate` route | Deployed contract | ethers.js server-side |
| Add "Donate with Crypto" button to event page | WalletContext | React component |
| Write `NexusReputation.sol` (SBT) | None | Solidity, OpenZeppelin |
| Deploy SBT contract | Contract compiled | Hardhat |
| Create `/api/web3/reputation/mint` | Deployed SBT, Firebase Admin | ethers.js |
| Add badge display to profile page | SBT contract | React, ethers.js |

### Phase 2: Data Integrity + IPFS (Weeks 4-5)

| Task | Dependencies | Tools |
|------|-------------|-------|
| Set up Pinata account + SDK | None | `pinata` npm package |
| Create `/api/ipfs/pin` route | Pinata API key | Pinata SDK |
| Modify `/api/events/create` to pin metadata | IPFS route | keccak256 hashing |
| Create `/api/ipfs/verify` route | IPFS route | Hash comparison |
| Add integrity badge to event cards UI | Verify route | React component |
| Implement reputation threshold checker | SBT contract, Firestore | Cron or event-driven |
| Build on-chain reputation display on leaderboard | SBT read methods | ethers.js, React |

### Phase 3: DAO Governance (Weeks 6-8)

| Task | Dependencies | Tools |
|------|-------------|-------|
| Write `NexusGovernor.sol` (OpenZeppelin Governor) | SBT contract (voting weight) | Solidity, OZ Governor |
| Deploy Governor + Timelock | Governor contract | Hardhat |
| Create proposal creation UI | Governor deployed | React, ethers.js |
| Create voting UI | Governor deployed | React, ethers.js |
| Implement proposal execution (milestone verification) | Governor + Escrow | Cross-contract calls |
| Add governance dashboard page | All governance contracts | Next.js page |

---

## 8. Tech Stack Additions

| Category | Tool | Version | Purpose |
|----------|------|---------|---------|
| Smart Contracts | Solidity | ^0.8.20 | Contract language |
| Contract Framework | Hardhat | ^2.22 | Compile, test, deploy |
| Contract Libraries | OpenZeppelin | ^5.0 | Security primitives |
| Frontend Web3 | ethers.js | ^6.13 | Contract interaction |
| Wallet UI | RainbowKit | ^2.0 | Wallet connect modal |
| React Web3 hooks | wagmi | ^2.0 | React hooks for contracts |
| Query layer | @tanstack/react-query | ^5.0 | Async state for Web3 calls |
| IPFS | Pinata SDK | ^1.0 | Pin/retrieve files |
| Network | Polygon PoS | Mainnet/Amoy | Low-cost L2 |
| RPC Provider | Alchemy | Free tier | Reliable RPC endpoint |
| Block Explorer | Polygonscan | — | Verification |

### New env vars needed:

```env
# Web3
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXUS_ESCROW_ADDRESS=0x...
NEXUS_REPUTATION_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...  # Server-side only, for minting

# IPFS
PINATA_API_KEY=your_key
PINATA_SECRET_KEY=your_secret

# Wallet
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wc_project_id
```

---

## 9. Security & Risk Analysis

### 9.1 Attack Vectors

| Vector | Risk | Mitigation |
|--------|------|------------|
| Fake events for donation fraud | High | Organizer verification SBT + milestone escrow (funds locked until verified) |
| Reentrancy on escrow | Critical | OpenZeppelin `ReentrancyGuard` on all payable functions |
| Fake attendance claims | Medium | QR scan verification (existing) + on-chain attestation from organizer wallet |
| Wallet impersonation | Medium | Signature verification on wallet linking (`ethers.verifyMessage`) |
| IPFS metadata tampering | Low | Keccak256 hash stored on-chain; compare before trusting |
| Gas price spikes | Medium | Polygon L2 keeps costs <$0.05; batch mints for SBTs |
| Private key leak (server) | Critical | Use AWS KMS or similar HSM; never store raw key in .env for production |
| Sybil attacks (fake volunteers) | Medium | SBTs are non-transferable; linked to verified Firebase accounts |

### 9.2 Smart Contract Audit Checklist

- [ ] All external calls use checks-effects-interactions pattern
- [ ] No `delegatecall` to untrusted contracts
- [ ] Arithmetic uses Solidity 0.8+ built-in overflow protection
- [ ] Access control on admin functions (Role-based via OZ)
- [ ] Event emission for all state changes
- [ ] No front-running vulnerabilities in donation flow
- [ ] Deadline enforcement prevents stale campaigns

---

## 10. Tradeoffs & Design Decisions

### Why Hybrid (not full Web3)

| Decision | Rationale |
|----------|-----------|
| **Keep Firebase for real-time** | Firestore real-time listeners power chat, notifications, Sentinel alerts. No blockchain can match sub-second push updates at this cost. |
| **Keep Firebase Auth as primary** | 95%+ of disaster relief volunteers won't have crypto wallets. Email/Google login must remain frictionless. |
| **Blockchain only for trust-critical paths** | Donations need transparency + escrow. Reputation needs immutability. Everything else is better served by Firebase. |
| **Polygon over Ethereum** | $0.01 vs $5-50 per tx. Disaster relief users shouldn't pay gas fees. We can subsidize on Polygon. |
| **SBTs over transferable NFTs** | Reputation should not be tradeable. A "100 hours volunteered" badge that you can buy defeats the purpose. |

### What NOT to Decentralize

| Component | Stays Web2 | Why |
|-----------|-----------|-----|
| Chat messages | Firebase | Real-time, high volume, no trust requirement |
| Sentinel alerts | Firebase + external APIs | Speed critical, no ownership semantics |
| User profiles | Firebase | Mutable data, real-time subscriptions needed |
| Event search/RAG | Firebase + Gemini | AI inference doesn't belong on-chain |
| Notifications | Firebase | Push delivery, no permanence needed |
| Bulk promotions | Nodemailer/Twilio | Communication channels, not data ownership |

---

## Bonus: Wallet Auth Flow (Complete)

```
1. User clicks "Connect Wallet" button
2. RainbowKit modal opens → user selects MetaMask/WalletConnect
3. Frontend gets wallet address via ethers.js
4. Frontend generates challenge: "Sign this to link wallet to NexusAid: {nonce}"
5. User signs message in wallet
6. Frontend sends to POST /api/web3/link-wallet:
   { firebaseUid, walletAddress, signature, message }
7. Server calls ethers.verifyMessage(message, signature)
8. Server confirms recovered address === walletAddress
9. Server updates Firestore: users/{uid}.walletAddress = walletAddress
10. Frontend WalletContext updates, UI shows connected state
11. Future donations route through smart contract instead of Razorpay
```
