# NexusAid Agent Guidelines

This is a **Next.js 16** application using **React 19**, **TailwindCSS v4**, **Ethers.js v6**, and **Firebase 12.x**.

Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Key patterns:
- Donation writes go through Admin SDK (server-side API routes), never client-side
- Wallet integration uses custom `useWallet` hook, not wagmi/RainbowKit
- Smart contract bindings live in `frontend/src/lib/web3/`
- TailwindCSS v4 with `@theme` in `globals.css`, no `tailwind.config.js`
