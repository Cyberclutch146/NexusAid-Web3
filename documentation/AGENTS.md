# NexusAid Agent Guidelines

This is a **Next.js 16** application using **React 19**, **TailwindCSS v4**, **Ethers.js v6**, and **Firebase 12.x**.

## Critical Rules

1. **Read Next.js docs first.** This version has breaking changes — APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

2. **Monorepo structure.** The repo uses npm workspaces with three packages:
   - `frontend/` — Next.js 16 app (App Router)
   - `backend/` — Express blockchain event indexer
   - `contracts/` — Hardhat + Solidity 0.8.24

3. **Donation writes use Admin SDK.** All donation records (`events/{id}/donations`, `users/{uid}/donations`) are written server-side via Firebase Admin SDK. Client-side writes to these collections are blocked by Firestore rules.

4. **Smart contract bindings** are in `frontend/src/lib/web3/` — `contract.ts`, `escrowContract.ts`, `reputationContract.ts`.

5. **Environment variables** for contract addresses use `NEXT_PUBLIC_DONATE_CONTRACT`, `NEXT_PUBLIC_ESCROW_CONTRACT`, `NEXT_PUBLIC_REPUTATION_CONTRACT`.

6. **Wallet integration** uses the custom `useWallet` hook in `frontend/src/hooks/useWallet.ts`, NOT wagmi or RainbowKit.

7. **TailwindCSS v4** — Use the v4 syntax. No `tailwind.config.js` file; configuration is in `globals.css` via `@theme`.
