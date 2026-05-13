# 🔒 NexusAid — Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue.**
2. Email the team directly with details of the vulnerability.
3. Include steps to reproduce the issue.
4. Allow reasonable time for a fix before public disclosure.

---

## Security Architecture

### Smart Contract Security

| Contract | Security Mechanism |
|---|---|
| `NexusEscrow.sol` | `ReentrancyGuard` on all payable functions, checks-effects-interactions pattern |
| `NexusReputation.sol` | `Ownable` (only owner can mint), Soulbound (transfers blocked via `_update()` override) |
| `NexusDonate.sol` | Campaign validation, organizer-only withdrawals |
| All contracts | Solidity 0.8.24 built-in overflow/underflow protection |

### API Security

- All sensitive API routes require Firebase ID token verification via `adminAuth.verifyIdToken()`
- Donation records are written exclusively via Firebase Admin SDK (server-side)
- Client-side Firestore writes to donation collections are blocked by security rules
- Razorpay payments are verified server-side using HMAC-SHA256 signature verification
- EIP-191 wallet linking verifies cryptographic signatures before storing wallet addresses

### Firestore Security Rules

- Donation subcollections (`events/{id}/donations`, `users/{uid}/donations`) are **write-once** and **admin-only write**
- User documents are accessible only by the document owner
- Pending donations can be created by authenticated users but cannot be deleted

### Environment Security

- Private keys (`DEPLOYER_PRIVATE_KEY`) are stored in `.env.local` (gitignored)
- Service account credentials (`serviceAccountKey.json`) are gitignored
- All `NEXT_PUBLIC_*` variables are safe for client-side exposure
- Non-public variables are only accessible in server-side API routes

---

## Known Security Considerations

| Area | Status | Detail |
|---|---|---|
| Smart contract audit | ⚠️ Not yet audited | Formal audit planned before mainnet deployment |
| Proxy upgrade pattern | ⚠️ Not implemented | Contracts are immutable; UUPS proxy planned for v0.4.0 |
| Rate limiting | ⚠️ Not implemented | API routes lack rate limiting; planned for production |
| CORS configuration | ✅ Configured | Backend Express server uses CORS middleware |
| MetaMask nonce management | ⚠️ Manual reset required | After Hardhat node restart, users must clear MetaMask activity tab data |

---

## Test Account Warning

⚠️ **The Hardhat test private key is publicly known:**
```
ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**NEVER use this key on mainnet or any real network.** It is exclusively for local Hardhat development. Anyone with this key has full control of the associated wallet.

---

## Dependencies

We regularly monitor dependencies for known vulnerabilities. Key security-critical dependencies:

| Package | Purpose | Security Role |
|---|---|---|
| `firebase-admin` | Server-side auth & database | Token verification, Admin SDK writes |
| `ethers` | Blockchain interaction | Signature verification, contract calls |
| `razorpay` | Payment processing | Payment signature verification |
| `@openzeppelin/contracts` | Smart contract libraries | Audited security primitives |
