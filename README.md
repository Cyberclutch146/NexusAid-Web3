<div align="center">
  
# 🤝 NexusAid

**The AI-Powered, Web3-Verified Decentralized Relief Coordination Platform**

[![Next.js](https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Services-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-1.5_Flash-4285F4?style=for-the-badge&logo=google-gemini)](https://ai.google.dev/)
[![Polygon](https://img.shields.io/badge/Polygon-Amoy_Testnet-8247E5?style=for-the-badge&logo=polygon)](https://polygon.technology/)
[![Ethers.js](https://img.shields.io/badge/Ethers.js-6.0-2535a0?style=for-the-badge&logo=ethereum)](https://docs.ethers.org/)

NexusAid is a cutting-edge platform designed to revolutionize disaster relief, volunteer coordination, and mutual aid. By combining the transparency of blockchain with the predictive power of Artificial Intelligence, NexusAid empowers local communities and NGOs to organize efficiently, build trust, and respond instantly during critical times.

[Report Bug](https://github.com/your-repo/issues) · [Request Feature](https://github.com/your-repo/issues)

</div>

---

## ✨ Revolutionary Pillars

### ⛓️ Web3 Trust & Transparent Escrow
* **Soulbound Tokens (SBTs):** Build immutable, on-chain reputation. Earn dynamic tiered badges (Bronze to Diamond) directly tied to your real-world volunteering hours and donations.
* **On-Chain Escrow:** Smart contract-based funding pools (NexusEscrow) ensure donations are securely locked and only released upon milestone completion.
* **Hybrid Storage:** Generated metadata and dynamic SVGs for user badges are uploaded securely to Firebase Storage, linked immutably on the Polygon network.

### 🛡️ Sentinel: Real-Time Environmental Hazard Monitoring
* **Live Telemetry:** Integrates directly with **USGS** and **NOAA** feeds to track environmental risks, including earthquakes, severe weather, and wildfires.
* **Geospatial Mapping:** Interactive map overlays via Leaflet to visually map out hazards and nearby relief events.
* **Automated Early Warnings:** Alerts organizers and volunteers of critical signals before they escalate, routing relief to where it's needed most.

### 🧠 Generative AI Operations
* **AI Matchmaking:** A proprietary scoring algorithm dynamically pairs volunteers to local needs based on unique skillsets, availability, and hardware resources.
* **Campaign Generators:** Effortlessly draft compelling campaign descriptions and needs-lists using Gemini 1.5.
* **Always-On Assistant:** Integrated 24/7 AI chatbot capable of answering community questions, guiding new volunteers, and breaking down complex tasks.

### ⚡ Mass Coordination & Communications
* **Omnichannel Broadcasts:** Native bulk parsing for `.csv`/`.xlsx` files, automatically mapping outreach strategies.
* **SMS & Email Automations:** Unified delivery of event invitations and updates via **Twilio** and **Nodemailer**.
* **Real-time Comms:** Dedicated Firebase-backed chat rooms for instantaneous team coordination on the ground.

---

## 🛠 Tech Stack Masterclass

| Domain | Technologies |
| :--- | :--- |
| **Frontend Architecture** | Next.js (App Router), React 19, TypeScript, Turbopack |
| **Styling & UI/UX** | Tailwind CSS 4, Framer Motion, Glassmorphism UI |
| **Web3 & Blockchain** | Solidity, Hardhat, Ethers.js v6, Polygon (Amoy Testnet) |
| **Database & Identity** | Firebase (Firestore, Auth, Admin SDK, Storage) |
| **Artificial Intelligence** | Google Generative AI (Gemini 1.5+), OpenAI API |
| **Mapping & Geospatial** | Leaflet.js, React-Leaflet, OpenStreetMap |
| **Communications** | Twilio, Nodemailer, Papaparse, XLSX |

---

## 🏗 System Architecture

### Macro Data Flow
```mermaid
graph TD
    Client[Next.js Client] -->|API Requests| NextAPI[Serverless API Routes]
    Client -->|Direct Read/Write| Firestore[(Firebase Firestore)]
    Client -->|Wallet Signatures| Web3[MetaMask / Polygon]
    
    NextAPI -->|Event Data & Storage| FirebaseAdmin[(Firebase Admin SDK)]
    NextAPI -->|Mass Emails| Nodemailer[Nodemailer]
    NextAPI -->|Mass SMS| Twilio[Twilio]
    NextAPI -->|Prompts| LLM[Google Gemini]
    NextAPI -->|Mint Badges| SmartContracts[Polygon Smart Contracts]
```

### On-Chain Identity Generation Flow (SBTs)
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant ClaimAPI as /api/web3/claim-badge
    participant FirebaseDB as Firestore
    participant Storage as Firebase Storage
    participant Polygon as Polygon Contract

    User->>Frontend: Clicks "Claim Badges"
    Frontend->>ClaimAPI: Request Claim (Wallet + UID)
    ClaimAPI->>FirebaseDB: Fetch Volunteer Hours & Donations
    FirebaseDB-->>ClaimAPI: Metrics returned
    ClaimAPI->>Storage: Generate SVG & JSON Metadata -> Upload
    Storage-->>ClaimAPI: Public URL (IPFS alternative)
    ClaimAPI->>Polygon: Execute `mintBadge()` with Metadata
    Polygon-->>ClaimAPI: Tx Hash & TokenID
    ClaimAPI->>FirebaseDB: Append Badge to User Profile
    ClaimAPI-->>Frontend: Success Toast & Tx Link
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed and configured:
- **Node.js 18+**
- **Firebase Project** (Firestore, Storage, Authentication)
- **Web3 Wallet** (MetaMask with Polygon Amoy network configured)
- API Keys for **Gemini** and (Optional) **Twilio/Razorpay**

### 2. Environment Configuration
Clone the repository and create a `.env.local` file in the root.

```env
# ==========================================
# FIREBASE CONFIGURATION
# ==========================================
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"
FIREBASE_PRIVATE_KEY="your_admin_private_key"
FIREBASE_CLIENT_EMAIL="your_admin_client_email"

# ==========================================
# WEB3 / POLYGON CONFIGURATION
# ==========================================
NEXT_PUBLIC_REPUTATION_CONTRACT="0xYourReputationContractAddress"
NEXT_PUBLIC_DONATE_CONTRACT="0xYourDonateContractAddress"
NEXT_PUBLIC_ESCROW_CONTRACT="0xYourEscrowContractAddress"
POLYGON_AMOY_RPC_URL="https://rpc-amoy.polygon.technology"
DEPLOYER_PRIVATE_KEY="your_wallet_private_key" # Required for server-side minting

# ==========================================
# ARTIFICIAL INTELLIGENCE
# ==========================================
GEMINI_API_KEY="your_gemini_key"
GEMINI_API_KEY_AI_CHAT_BOT="your_gemini_bot_key"

# ==========================================
# MASS COMMUNICATIONS (Optional)
# ==========================================
EMAIL="your_smtp_email@gmail.com"
EMAIL_PASS="your_smtp_password"
TWILIO_SID="your_twilio_sid"
TWILIO_AUTH="your_twilio_auth"
TWILIO_PHONE="your_twilio_phone"
```

### 3. Installation & Execution
```bash
# Install package dependencies
npm install

# Start the development server
npm run dev
```
Navigate to `http://localhost:3000` to access the platform.

---

## 🔐 Security & Operations
* **Strict Admin Validations:** The `claim-badge` and mass-communication endpoints use the Firebase Admin SDK to ensure no malicious client can manipulate their reputation or bypass access controls.
* **On-Chain Immutability:** Escrow ledgers and Badge mappings are permanently secured on the Polygon network.
* **Serverless Scale:** Powered by Vercel edge/serverless architecture, ensuring immediate global scaling during rapid emergency relief demands.

---

<div align="center">
  <i>Engineered with ❤️ for decentralized community resilience.</i>
</div>
