# 🚀 NexusAid Complete Local Setup Guide

This guide will walk you through exactly how to take this project, put it on a brand new computer, and get everything running perfectly from scratch. No steps skipped!

> **Last Updated:** May 13, 2026

---

## 🛠️ Step 1: Install the Basics
Before downloading the code, make sure the new computer has the essential tools installed:
1. **Node.js (LTS version):** This is the engine that runs our JavaScript code. Download and install it from [nodejs.org](https://nodejs.org/).
2. **Git:** This lets you download the code from your repository. Download from [git-scm.com](https://git-scm.com/).
3. **MetaMask:** Browser extension wallet for blockchain interaction. Download from [metamask.io](https://metamask.io/).

---

## 📦 Step 2: Download the Code
1. Open your computer's terminal (PowerShell on Windows, Terminal on Mac).
2. Download the project and go into the folder:
   ```bash
   git clone https://github.com/Cyberclutch146/NexusAid-Web3.git
   cd NexusAid-Web3
   ```
3. Install all the required packages for the whole project (frontend, backend, and smart contracts) at once:
   ```bash
   npm install
   ```

---

## 🔑 Step 3: Get Your Secret Keys (Firebase & Pinata)

You need to connect your local code to your cloud databases and storage. You'll need two things:

### A. Firebase (Database)
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Open your project (`cbday-2e6ca`).
3. Go to **Project Settings** (the gear icon) → **Service Accounts**.
4. Click **"Generate new private key"**. This will download a `.json` file.
5. Rename that downloaded file exactly to `serviceAccountKey.json`.
6. Move `serviceAccountKey.json` into the `frontend/` folder of your project.

### B. Pinata (IPFS Image Storage)
1. Go to [pinata.cloud](https://pinata.cloud) and log in.
2. Go to the **API Keys** section and generate a new key.
3. Save the **API Key**, **API Secret**, and your **Gateway URL** somewhere safe for the next step.

---

## 📝 Step 4: Setup Environment Variables (`.env` files)

You need to tell your code where the secrets are.

### Frontend `.env.local`
1. Go into the `frontend/` folder.
2. Create a file named `.env.local` (or copy `.env.example` if it exists).
3. Fill it with this exact template, replacing the bracketed parts with your actual keys:

```env
# ─── Firebase Client (Public) ────────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cbday-2e6ca.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cbday-2e6ca
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cbday-2e6ca.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# ─── Firebase Admin (Server-side) ────────────────────────
FIREBASE_PROJECT_ID=cbday-2e6ca
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@cbday-2e6ca.iam.gserviceaccount.com
# Note: The private key is automatically loaded from your serviceAccountKey.json file

# ─── Pinata IPFS ─────────────────────────────────────────────
PINATA_API_KEY=[YOUR_PINATA_API_KEY]
PINATA_SECRET_KEY=[YOUR_PINATA_SECRET_KEY]
NEXT_PUBLIC_PINATA_GATEWAY_URL=[YOUR_PINATA_GATEWAY_URL]

# ─── Web3 (Smart Contract Addresses - Auto-filled by deploy scripts) ─
NEXT_PUBLIC_DONATE_CONTRACT=
NEXT_PUBLIC_ESCROW_CONTRACT=
NEXT_PUBLIC_REPUTATION_CONTRACT=

# ─── Blockchain RPC ──────────────────────────────────────────
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
POLYGON_AMOY_RPC_URL=http://127.0.0.1:8545
DEPLOYER_PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# ─── Cloudinary ──────────────────────────────────────────────
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset

# ─── AI (Gemini) ─────────────────────────────────────────────
GEMINI_API_KEY_AI_CHAT_BOT=your_gemini_api_key

# ─── Payments (Razorpay) ─────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx

# ─── Notifications ───────────────────────────────────────────
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
EMAIL=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Backend `.env`
1. Go into the `backend/` folder.
2. Copy the example file to create the real one:
   ```bash
   cp .env.example .env
   ```
3. Open `backend/.env`. Ensure the `GOOGLE_APPLICATION_CREDENTIALS` line points to the service account file:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=../frontend/serviceAccountKey.json
   RPC_URL=http://127.0.0.1:8545
   PORT=4000
   ```
   *(Contract addresses will be auto-filled by the deploy scripts.)*

---

## 🏗️ Step 5: Start Everything (The Easy Way)

The recommended approach is the **unified launcher** — one command starts everything:

```bash
npm start
```

**What this does automatically:**
1. Starts the local Hardhat blockchain node
2. Deploys all three smart contracts (`NexusDonate`, `NexusEscrow`, `NexusReputation`)
3. Synchronizes contract addresses into your `.env` files
4. Resets stale blockchain data in Firestore
5. Starts the Backend Event Indexer (port 4000)
6. Starts the Frontend Next.js server (port 3000)

Navigate to **http://localhost:3000** to see the app!

---

## 🏗️ Step 5 (Alternative): The Manual Way

If you prefer separate terminal control:

### Terminal 1 — Blockchain Node
```bash
npm run node:contracts
```
*(Keep this running — the blockchain only exists while this terminal is open)*

### Terminal 2 — Deploy Contracts
```bash
npm run deploy:local
```
Copy the printed contract addresses into your `.env.local` and `backend/.env` files if not auto-synced.

### Terminal 3 — Backend Event Indexer
```bash
npm run dev:backend
```
*(You should see "✅ Indexer HTTP server running on http://localhost:4000")*

### Terminal 4 — Frontend Website
```bash
npm run dev:frontend
```
*(You should see "▲ Next.js 16.2.4 — ready in ~800ms")*

---

## 🦊 Step 6: Configure MetaMask

1. Click the **MetaMask fox icon** 🦊 in your browser toolbar.
2. Click the **network dropdown** → **Add network** → **Add a network manually**.
3. Fill in:

| Field | Value |
|---|---|
| **Network Name** | `Hardhat Local` |
| **New RPC URL** | `http://127.0.0.1:8545` |
| **Chain ID** | `31337` |
| **Currency Symbol** | `ETH` |
| **Block Explorer URL** | *(leave blank)* |

4. Import a test account: **Account icon** → **Import account** → paste:
   ```
   ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

🎉 You should now see ~10,000 ETH in your MetaMask!

> ⚠️ **NEVER use this private key on a real network.** It's Hardhat's publicly known default test key.

---

## 🔄 Restarting After a Break

After a PC restart or closing terminals:

1. **Start everything:** `npm start` (or `npm run dev:all`)
2. **Reset MetaMask:** Settings → Advanced → **Clear activity tab data**

If using the manual method:
1. Start blockchain: `npm run node:contracts`
2. Deploy: `npm run deploy:local`
3. Reset Firestore: `npm run db:reset-web3`
4. Start servers: `npm run dev:app`
5. Reset MetaMask activity tab data

---

## 🎉 You're Done!
Open your browser and go to `http://localhost:3000`. The entire NexusAid platform is now running locally on your new machine!
