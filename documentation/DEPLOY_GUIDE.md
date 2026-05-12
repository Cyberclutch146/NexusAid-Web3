# 🚀 NexusAid — How to Deploy (For Complete Beginners)

> **No blockchain experience needed.** This guide assumes you've never touched Web3, MetaMask, or Solidity before. Follow every step exactly and you'll have a fully working local blockchain + NexusAid frontend running on your machine in under 15 minutes.

Good luck deploying!

---

## Table of Contents

1. [What You're About to Do (Plain English)](#1-what-youre-about-to-do-plain-english)
2. [Prerequisites (Install These First)](#2-prerequisites-install-these-first)
3. [Step 1 — Clone the Project](#3-step-1--clone-the-project)
4. [Step 2 — Install Dependencies](#4-step-2--install-dependencies)
5. [Step 3 — Start Your Personal Blockchain](#5-step-3--start-your-personal-blockchain)
6. [Step 4 — Deploy the Smart Contracts](#6-step-4--deploy-the-smart-contracts)
7. [Step 5 — Configure Environment Variables](#7-step-5--configure-environment-variables)
8. [Step 6 — Install MetaMask](#8-step-6--install-metamask)
9. [Step 7 — Connect MetaMask to Your Local Blockchain](#9-step-7--connect-metamask-to-your-local-blockchain)
10. [Step 8 — Import a Test Wallet (Free Money!)](#10-step-8--import-a-test-wallet-free-money)
11. [Step 9 — Start the Website](#11-step-9--start-the-website)
12. [Step 10 — Make Your First Donation](#12-step-10--make-your-first-donation)
13. [Restarting After a Break](#13-restarting-after-a-break)
14. [Troubleshooting](#14-troubleshooting)
15. [Glossary](#15-glossary)

---

## 1. What You're About to Do (Plain English)

Here's what's going to happen, explained without any jargon:

1. **You'll run a fake blockchain on your computer.** Think of it like a video game server — it looks and behaves exactly like Ethereum, but it's completely private to your machine. No real money involved. Ever.

2. **You'll "deploy" three programs onto that fake blockchain.** These programs (called "smart contracts") are the rules that govern how donations work, how funds are locked in escrow, and how reputation badges are awarded. Deploying just means uploading them.

3. **You'll install a browser extension called MetaMask.** This is your "wallet" — think of it like Apple Pay, but for blockchain. It lets the website talk to your fake blockchain.

4. **You'll import a test account with 10,000 fake ETH.** This is monopoly money. It costs nothing. You can spend it freely to test donations.

5. **You'll start the NexusAid website.** It connects to your fake blockchain through MetaMask and everything works end-to-end.

**Total cost: $0. Total risk: zero. Everything is local to your machine.**

---

## 2. Prerequisites (Install These First)

You need exactly **three things** installed. If you already have them, skip ahead.

### A. Node.js (v18 or higher)

Node.js is the engine that runs JavaScript outside of a browser. Both the website and the blockchain tools need it.

1. Go to **https://nodejs.org**
2. Download the **LTS** version (the big green button)
3. Run the installer. Click Next/Yes through everything.
4. Verify it worked — open a terminal and type:
   ```
   node --version
   ```
   You should see something like `v22.18.0`. Any number ≥ 18 is fine.

> **How to open a terminal:**
> - **Windows:** Press `Win + R`, type `cmd`, press Enter. Or search for "PowerShell" in the Start menu.
> - **Mac:** Press `Cmd + Space`, type "Terminal", press Enter.
> - **Linux:** Press `Ctrl + Alt + T`.

### B. Git

Git is a tool for downloading code from GitHub.

1. Go to **https://git-scm.com/downloads**
2. Download and install for your OS.
3. Verify:
   ```
   git --version
   ```

### C. A Modern Web Browser

Chrome, Brave, Firefox, or Edge. You'll need this for MetaMask (Step 6).

---

## 3. Step 1 — Clone the Project

"Cloning" means downloading the entire codebase from GitHub to your computer.

Open your terminal and run:

```bash
git clone https://github.com/Cyberclutch146/NexusAid-Web3.git
```

Then move into the project folder:

```bash
cd NexusAid-Web3
```

> 💡 **Tip:** You can also download the ZIP from GitHub and extract it, but cloning is easier for updates later.

---

## 4. Step 2 — Install Dependencies

Dependencies are pre-built code libraries that NexusAid uses (like React, Ethers.js, etc). One command installs everything:

```bash
npm install
```

⏳ **This will take 1-3 minutes.** You'll see a lot of text scroll by. That's normal. Wait until you see your cursor blinking again.

> If you see yellow `WARN` messages, that's fine. Only red `ERR!` messages are problems.

---

## 5. Step 3 — Start Your Personal Blockchain

This is the coolest part. You're about to run a full Ethereum-compatible blockchain on your laptop.

**Open a NEW terminal window** (keep it separate — this needs to stay running) and run:

```bash
cd NexusAid-Web3/contracts
npx hardhat node
```

You'll see output like this:

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========

Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

... (18 more accounts)
```

🎉 **Congratulations!** You are now running a blockchain. It's listening at `http://127.0.0.1:8545`.

> ⚠️ **VERY IMPORTANT:** Do NOT close this terminal window. The blockchain only exists while this is running. If you close it, everything resets (but you can always restart it).

> 📝 **Save Account #0's details.** You'll need the address and private key later:
> - Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
> - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

## 6. Step 4 — Deploy the Smart Contracts

Now you'll upload the three NexusAid programs onto your blockchain.

**Open ANOTHER new terminal window** (that's three total — one for the blockchain, one for deploying, one you'll use later for the website).

Navigate to the contracts folder and deploy each contract one at a time:

```bash
cd NexusAid-Web3/contracts
```

**Deploy the Donation contract:**
```bash
npx hardhat run scripts/deploy/deploy-donate.js --network localhost
```
You'll see output like:
```
NexusDonate deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Deploy the Escrow contract:**
```bash
npx hardhat run scripts/deploy/deploy-escrow.js --network localhost
```
Output:
```
NexusEscrow deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

**Deploy the Reputation/Badge contract:**
```bash
npx hardhat run scripts/deploy/deploy-reputation.js --network localhost
```
Output:
```
NexusReputation deployed to: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
```

📝 **Write down all three addresses!** You'll need them in the next step.

> 💡 **What just happened?** You uploaded three programs to your blockchain. They now have permanent addresses, just like houses have street addresses. Anyone (or any website) that knows the address can interact with the program.

---

## 7. Step 5 — Configure Environment Variables

The website needs to know where to find your blockchain and your contracts. This is done via a configuration file.

1. Navigate to the `frontend/` folder.
2. Look for a file called `.env.local`. If it exists, open it. If not, create a new file called `.env.local` inside the `frontend/` folder.
3. Make sure these lines are present (update the contract addresses if yours are different):

```env
# ─── Blockchain Connection ────────────────────────────────
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
POLYGON_AMOY_RPC_URL=http://127.0.0.1:8545
DEPLOYER_PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# ─── Smart Contract Addresses ─────────────────────────────
# (Replace with YOUR addresses from Step 4 if different)
NEXT_PUBLIC_DONATE_CONTRACT=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_ESCROW_CONTRACT=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NEXT_PUBLIC_REPUTATION_CONTRACT=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
```

4. Save the file.

> 💡 **What is `.env.local`?** It's like a settings file. The website reads it on startup to know where things are. The `.local` suffix means it stays on YOUR machine and never gets uploaded to GitHub (which is important because it can contain secrets).

---

## 8. Step 6 — Install MetaMask

MetaMask is a browser extension that acts as your blockchain wallet. It's how the website sends transactions to your local blockchain.

1. Open your browser (Chrome, Brave, or Firefox recommended).
2. Go to **https://metamask.io/download/**
3. Click **"Install MetaMask for [your browser]"**.
4. Click **"Add to Chrome"** (or equivalent).
5. A fox icon 🦊 will appear in your browser toolbar.

### First-Time Setup

When you open MetaMask for the first time:

1. Click **"Create a new wallet"**.
2. Agree to the terms.
3. Create a password (this is just for the browser extension, not related to crypto).
4. It will show you a "Secret Recovery Phrase" — **for local testing, you can skip this**. Just click through. This is a test setup, not real money.
5. You'll land on the MetaMask home screen. Done!

> ⚠️ **This is a TEST wallet.** Do not send real cryptocurrency to it. We'll import a pre-funded test account in the next step.

---

## 9. Step 7 — Connect MetaMask to Your Local Blockchain

By default, MetaMask talks to the real Ethereum network. You need to point it at YOUR local blockchain.

### Add the Hardhat Network

1. Click the **MetaMask fox icon** 🦊 in your browser toolbar.
2. Click the **network dropdown** at the top (it probably says "Ethereum Mainnet").
3. Click **"Add network"** → then **"Add a network manually"**.
4. Fill in these EXACT values:

| Field | Value |
|---|---|
| **Network Name** | `Hardhat Local` |
| **New RPC URL** | `http://127.0.0.1:8545` |
| **Chain ID** | `31337` |
| **Currency Symbol** | `ETH` |
| **Block Explorer URL** | *(leave blank)* |

5. Click **Save**.
6. Click **"Switch to Hardhat Local"** when prompted.

MetaMask should now show "Hardhat Local" in the network dropdown.

---

## 10. Step 8 — Import a Test Wallet (Free Money!)

Your local blockchain came pre-loaded with 20 test accounts, each holding 10,000 ETH. Let's import one.

1. Click the **MetaMask fox icon** 🦊.
2. Click the **account icon** (circle in the top-right).
3. Click **"Add account or hardware wallet"**.
4. Click **"Import account"**.
5. In the "Private Key" field, paste this exact key:

```
ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

6. Click **Import**.

🎉 **You should now see ~10,000 ETH in your MetaMask!** This is fake money from your local blockchain. Spend freely.

> ⚠️ **NEVER use this private key on a real network.** This key is publicly known (it's Hardhat's default test key). Anyone who uses it on a real network will have their funds stolen instantly. It's ONLY for local testing.

---

## 11. Step 9 — Start the Website

You're almost there! Go back to your terminal (the one that ISN'T running the blockchain) and run:

```bash
cd NexusAid-Web3
npm run dev:frontend
```

You'll see:

```
▲ Next.js 16.2.4 (Turbopack)
- Local:    http://localhost:3000
- Network:  http://192.168.x.x:3000

✓ Ready in 800ms
```

🎉 **Open your browser and go to http://localhost:3000**

You should see the NexusAid platform!

---

## 12. Step 10 — Make Your First Donation

Let's test everything end-to-end:

1. **Sign up / Log in** to NexusAid (you'll need a Firebase account — use Google Sign-In if available).
2. Navigate to any **event page** (or create one via the **Create** page).
3. Scroll down to the **"Donate with Crypto"** section.
4. Click **"Connect MetaMask"**.
5. MetaMask will pop up asking to connect. Click **"Connect"**.
   - If it asks to switch networks, click **"Switch"**. The app will auto-switch you to Hardhat.
6. Select an amount (e.g., `0.01`) and click **"Donate 0.01 ETH"**.
7. MetaMask will pop up showing the transaction details. Click **"Confirm"**.
8. Wait 1-2 seconds. You'll see a ✅ confirmation message.

**That's it! You just made an on-chain donation on your local blockchain!** 🎊

You can verify it by:
- Checking MetaMask — your balance will have decreased by ~0.01 ETH.
- Going to the **Blockchain Hub** (`/dashboard/blockchain`) — it should show "Hardhat" as the network and your correct balance.

---

## 13. Restarting After a Break

If you close everything and come back later, you have two ways to restart: the **Manual Way** (good for learning) or the **Fast Way** (best for daily work).

### Option A: The Fast Way (Automated)

We've created scripts to start everything with a single command. Open **one** terminal in the root `NexusAid-Web3` folder:

1. **Start Everything:**
   ```bash
   npm run dev:all
   ```
   *This starts the node, waits for it to be ready, deploys your contracts, starts the backend, and starts the frontend all in one window.*

2. **If you restarted your PC:**
   After running `dev:all`, open a second terminal and run:
   ```bash
   npm run db:reset-web3
   ```
   *This cleans up your database so your old events can be re-registered on the fresh blockchain.*

3. **Reset MetaMask (REQUIRED):**
   MetaMask → **Settings** → **Advanced** → **Clear activity tab data**.

---

### Option B: The Pro Way (Persistent Data)

If you want to keep your blockchain data (donations, etc.) alive even if you stop working on the website, use this method:

**Terminal 1 (Blockchain):**
Keep this running forever (or until you restart your PC).
```bash
npm run node:contracts
```

**Terminal 2 (One-time):**
Run this only once after starting the node.
```bash
npm run deploy:local
```

**Terminal 3 (Work):**
Run this every time you want to code. It only starts the website and backend.
```bash
npm run dev:app
```

---

### Critical Maintenance Steps

Regardless of which method you use, if the **blockchain node restarts** (because you closed the terminal or restarted your PC), you **MUST** do these two things:

1. **Reset MetaMask Activity:**
   MetaMask → **Settings** → **Advanced** → **Clear activity tab data**.
   *If you don't do this, you will get "Nonce too high" or "Internal JSON-RPC" errors.*

2. **Sync the Database:**
   ```bash
   npm run db:reset-web3
   ```
   *If you don't do this, your old events will say "Campaign not active" because the new blockchain doesn't know about them yet.*

---

## 14. Troubleshooting

### "MetaMask shows 0 ETH"

**Cause:** MetaMask is connected to the wrong network, or the node was restarted without resetting MetaMask.

**Fix:**
1. Check the network dropdown in MetaMask. It should say "Hardhat Local".
2. If it does, go to Settings → Advanced → Clear activity tab data.
3. If "Hardhat Local" isn't listed, add it again (see Step 7).

---

### "Insufficient funds" error when donating

**Cause:** Same as above. MetaMask is talking to the wrong network, or it has stale data.

**Fix:**
1. In MetaMask, switch to a different network (e.g., Ethereum Mainnet), then switch BACK to "Hardhat Local". This forces a refresh.
2. If that doesn't work, clear activity tab data (Settings → Advanced).
3. Hard refresh the website (`Ctrl + F5`).

---

### "Nonce too high" error

**Cause:** You restarted the Hardhat node but MetaMask still remembers transactions from the old session.

**Fix:** Settings → Advanced → Clear activity tab data. This is the fix for 90% of local development issues.

---

### "NETWORK_ERROR: network changed"

**Cause:** MetaMask switched networks and the website's connection got confused.

**Fix:** The website should auto-reload. If it doesn't, press `Ctrl + F5`.

---

### The website won't start (`npm run dev:frontend` fails)

**Cause:** Dependencies might not be installed, or you're in the wrong directory.

**Fix:**
```bash
cd NexusAid-Web3
npm install
npm run dev:frontend
```

---

### "Contract not found" or "BAD_DATA" errors

**Cause:** The contract addresses in `.env.local` don't match what's actually deployed.

**Fix:**
1. Re-deploy the contracts (Step 4).
2. Copy the NEW addresses into `frontend/.env.local`.
3. Restart the frontend (`Ctrl + C`, then `npm run dev:frontend`).

---

### The Hardhat node crashed or I closed the terminal

**Cause:** The blockchain only exists while the `npx hardhat node` command is running.

**Fix:** Follow the full "Restarting After a Break" procedure (Section 13).

---

### MetaMask popup doesn't appear when I click "Connect"

**Cause:** MetaMask might be locked, or the popup was blocked.

**Fix:**
1. Click the MetaMask fox icon and make sure you're logged in.
2. Check if your browser blocked the popup (look for a popup-blocked icon in the address bar).
3. Try clicking "Connect" again.

---

## 15. Glossary

| Term | Plain English Meaning |
|---|---|
| **Blockchain** | A shared, tamper-proof record book. Once something is written, it can never be changed or deleted. |
| **Smart Contract** | A program that lives on a blockchain. It runs automatically when certain conditions are met — no middleman needed. |
| **MetaMask** | A browser extension that acts as your blockchain wallet. It stores your keys and signs transactions. |
| **Hardhat** | A developer tool that creates a fake blockchain on your computer for testing. No real money involved. |
| **ETH (Ether)** | The currency of the Ethereum blockchain. On our local Hardhat network, it's completely fake and free. |
| **MATIC** | The currency of the Polygon blockchain (used in production). On testnets, it's also free. |
| **Deploy** | Uploading a smart contract to a blockchain. Once deployed, it gets a permanent address. |
| **Transaction (tx)** | Any action that changes blockchain state — like sending a donation. Each one costs a tiny "gas fee." |
| **Gas Fee** | A small fee paid to the blockchain network for processing your transaction. On our local network, it's practically zero. |
| **Private Key** | A secret password that controls a blockchain wallet. Anyone with this key has full control. NEVER share real private keys. |
| **RPC URL** | The "phone number" your computer uses to talk to a blockchain node. `http://127.0.0.1:8545` means "the blockchain running on my own machine." |
| **Chain ID** | A unique number identifying a blockchain network. Hardhat = 31337, Polygon Amoy = 80002, Ethereum = 1. |
| **Wallet Address** | Your public identity on the blockchain — like an email address. Safe to share. Example: `0xf39F...2266`. |
| **Soulbound Token (SBT)** | A special NFT that cannot be sold or transferred. It permanently represents an achievement, like a diploma. |
| **Escrow** | A system where a trusted third party (in our case, a smart contract) holds money until conditions are met. |
| **Testnet** | A practice version of a real blockchain. Uses fake money. Good for testing before going live. |
| **Mainnet** | The real blockchain where real money is used. NexusAid will eventually deploy here. |
| **EIP-191** | A standard for signing messages with your wallet. Used to prove "I own this wallet" without making a transaction. |
| **Node** | A computer running blockchain software. When you run `npx hardhat node`, YOUR computer becomes a node. |
| **ABI** | A description of what functions a smart contract has — like a menu at a restaurant. The website needs this to know what to order. |
| **Monorepo** | A single Git repository that contains multiple related projects (frontend, backend, contracts) organized into folders. |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                  NexusAid Quick Start                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Option 1: The Fast Way (Full Auto)                     │
│  $ npm run dev:all                                      │
│                                                         │
│  Option 2: The Pro Way (Persistent Node)                │
│  $ npm run node:contracts   (Terminal 1)                │
│  $ npm run deploy:local     (Terminal 2 - Once)         │
│  $ npm run dev:app          (Terminal 3 - Daily)        │
│                                                         │
│  ⚠  AFTER PC RESTART OR NODE RESET:                     │
│  1. $ npm run db:reset-web3                             │
│  2. MetaMask -> Settings -> Advanced ->                 │
│     Clear activity tab data                             │
│                                                         │
│  MetaMask Network:                                      │
│    Name:     Hardhat Local                              │
│    RPC URL:  http://127.0.0.1:8545                      │
│    Chain ID: 31337                                      │
│                                                         │
│  Test Private Key:                                      │
│  ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae...  │
└─────────────────────────────────────────────────────────┘
```

---

<div align="center">

**You did it! Welcome to Web3.** 🎉

*If something doesn't work, re-read the troubleshooting section. 90% of issues are solved by clearing MetaMask activity tab data.*

</div>
