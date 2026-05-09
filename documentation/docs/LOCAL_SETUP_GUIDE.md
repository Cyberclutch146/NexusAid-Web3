# 🚀 NexusAid Complete Local Setup Guide

This guide will walk you through exactly how to take this project, put it on a brand new computer, and get everything running perfectly from scratch. No steps skipped!

---

## 🛠️ Step 1: Install the Basics
Before downloading the code, make sure the new computer has the essential tools installed:
1. **Node.js (LTS version):** This is the engine that runs our JavaScript code. Download and install it from [nodejs.org](https://nodejs.org/).
2. **Git:** This lets you download the code from your repository. Download from [git-scm.com](https://git-scm.com/).

---

## 📦 Step 2: Download the Code
1. Open your computer's terminal (Command Prompt on Windows, Terminal on Mac).
2. Download the project and go into the folder:
   ```bash
   git clone <YOUR_GITHUB_REPOSITORY_URL>
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
3. Fill it with this exact template, replacing the Pinata bracketed parts with your actual keys:

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

# ─── Web3 (Smart Contract Addresses - We'll fill these later) ─
NEXT_PUBLIC_DONATE_CONTRACT=
NEXT_PUBLIC_ESCROW_CONTRACT=
NEXT_PUBLIC_REPUTATION_CONTRACT=
```

### Backend `.env`
1. Go into the `backend/` folder.
2. Copy the example file to create the real one:
   ```bash
   cp .env.example .env
   ```
3. Open `backend/.env`. Ensure the `GOOGLE_APPLICATION_CREDENTIALS` line points to the file you put in the frontend folder:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=../frontend/serviceAccountKey.json
   RPC_URL=http://127.0.0.1:8545
   PORT=4000
   ```
   *(We will fill in the contract addresses in Step 5).*

---

## 🏗️ Step 5: Start the Blockchain & Deploy

Now we turn on your local mini-blockchain and upload your smart contracts to it.

1. **Start the Blockchain:** Open a **NEW Terminal window** (keep it open) and run:
   ```bash
   npm run node:contracts
   ```
   *(This starts your local Hardhat node on port 8545).*

2. **Deploy the Contracts:** Open another **NEW Terminal window** and run:
   ```bash
   npm run deploy:local
   ```
   *(This uploads your smart contracts and creates fake demo campaigns).*

3. **Copy the Addresses:** When `deploy:local` finishes, it will print a block of text containing addresses for `NEXT_PUBLIC_DONATE_CONTRACT`, `ESCROW_CONTRACT`, etc.
   - Copy the `NEXT_PUBLIC_...` lines into your `frontend/.env.local` file.
   - Copy the `DONATE_CONTRACT_ADDRESS...` lines into your `backend/.env` file.

---

## 🏃‍♂️ Step 6: Start the Engines

You should now have **3 Terminal windows** running simultaneously to power the whole app:

1. **Terminal 1 (Blockchain Node):** 
   Should already be running from Step 5 (`npm run node:contracts`).
   
2. **Terminal 2 (Backend Listener):** 
   This listens for blockchain events and saves them to Firebase. Run:
   ```bash
   npm run dev:backend
   ```
   *(You should see "✅ Indexer HTTP server running on http://localhost:4000")*

3. **Terminal 3 (Frontend Website):** 
   This runs the actual Next.js website. Run:
   ```bash
   npm run dev:frontend
   ```
   *(You should see "ready - started server on 0.0.0.0:3000")*

---

## 🎉 You're Done!
Open your browser and go to `http://localhost:3000`. The entire NexusAid platform is now running locally on your new machine!
