# 🤝 Contributing to NexusAid

Thank you for your interest in contributing to NexusAid! This guide will help you get started.

---

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/NexusAid-Web3.git
   cd NexusAid-Web3
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Start the development environment:**
   ```bash
   npm start
   ```
   See [DEPLOY_GUIDE.md](./documentation/DEPLOY_GUIDE.md) for detailed setup instructions.

---

## Project Structure

This is a monorepo with three workspaces:

| Workspace | Path | Description |
|---|---|---|
| **Frontend** | `frontend/` | Next.js 16 application (React 19, TailwindCSS v4, Ethers.js v6) |
| **Backend** | `backend/` | Express blockchain event indexer with Firebase sync |
| **Contracts** | `contracts/` | Hardhat + Solidity 0.8.24 smart contracts |

See [ARCHITECTURE.md](./documentation/ARCHITECTURE.md) for detailed architecture documentation.

---

## Development Workflow

### Branch Naming
- `feature/description` — New features
- `fix/description` — Bug fixes
- `refactor/description` — Code refactoring
- `docs/description` — Documentation updates

### Commit Messages
Use clear, descriptive commit messages with prefixes:
- `feat:` — New feature
- `fix:` — Bug fix
- `refactor:` — Code refactoring
- `docs:` — Documentation
- `style:` — Formatting, no logic change
- `test:` — Adding or updating tests

### Pull Requests
1. Create a feature branch from `main`.
2. Make your changes with clear commits.
3. Push to your fork and open a PR against `main`.
4. Describe what your PR does and why.
5. Reference any related issues.

---

## Code Style

### Frontend (TypeScript/React)
- Use TypeScript for all new files
- Use functional components with hooks
- Use TailwindCSS v4 for styling (no inline styles)
- Place components in `src/components/` organized by feature
- Place business logic in `src/services/`
- Place hooks in `src/hooks/`

### Smart Contracts (Solidity)
- Solidity 0.8.24
- Use OpenZeppelin contracts where applicable
- Add NatSpec comments to all public functions
- Follow checks-effects-interactions pattern

### Backend (JavaScript)
- Use CommonJS (`require`) modules
- Place listeners in `src/listeners/`
- Place config in `src/config/`

---

## Key Conventions

1. **Donation writes are server-side only.** All donation records go through API routes using Firebase Admin SDK. Client-side Firestore writes to donation collections are blocked.

2. **Wallet integration uses `useWallet` hook.** Do not introduce wagmi, RainbowKit, or other wallet libraries.

3. **Contract addresses come from environment variables.** Use `NEXT_PUBLIC_DONATE_CONTRACT`, `NEXT_PUBLIC_ESCROW_CONTRACT`, `NEXT_PUBLIC_REPUTATION_CONTRACT`.

4. **API routes verify authentication.** All sensitive routes must verify Firebase ID tokens via `adminAuth.verifyIdToken()`.

---

## Documentation

- **[README.md](./README.md)** — Project overview and setup
- **[ARCHITECTURE.md](./documentation/ARCHITECTURE.md)** — Technical architecture and design decisions
- **[PROJECT_STATUS.md](./documentation/PROJECT_STATUS.md)** — Current development status
- **[ROADMAP.md](./documentation/ROADMAP.md)** — 42-feature strategic roadmap
- **[DEPLOY_GUIDE.md](./documentation/DEPLOY_GUIDE.md)** — Beginner's deployment guide
- **[WEB3_IMPLEMENTATION_PLAN.md](./documentation/WEB3_IMPLEMENTATION_PLAN.md)** — Next Web3 feature specs

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
