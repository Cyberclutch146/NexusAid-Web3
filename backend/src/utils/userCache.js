'use strict';

/**
 * userCache.js
 * In-memory cache for walletAddress → Firebase userId lookups.
 *
 * Without this cache, every blockchain event (DonationReceived, BadgeMinted)
 * would fire a Firestore query to look up the user by wallet address — even
 * for the same wallet that donated 10 times in a row.
 *
 * The cache lives for the lifetime of the backend process and is intentionally
 * kept simple: no LRU eviction since the number of unique wallets is bounded.
 */

/** @type {Map<string, string | null>} walletAddress (lowercase) → userId | null */
const cache = new Map();

/**
 * Look up the Firebase userId for a given wallet address.
 * Returns null if no user is linked to that wallet.
 * Results are cached in memory indefinitely for the process lifetime.
 *
 * @param {string} walletAddress  — lowercase Ethereum address
 * @param {FirebaseFirestore.Firestore} db  — Admin SDK Firestore instance
 * @returns {Promise<string | null>}
 */
async function getUserIdByWallet(walletAddress, db) {
  const addr = walletAddress.toLowerCase();

  if (cache.has(addr)) {
    return cache.get(addr);
  }

  try {
    const snap = await db
      .collection('users')
      .where('walletAddress', '==', addr)
      .limit(1)
      .get();

    const userId = snap.empty ? null : snap.docs[0].id;
    cache.set(addr, userId);

    if (userId) {
      console.log(`   📦 [UserCache] Cached wallet ${addr} → user ${userId}`);
    } else {
      console.log(`   📦 [UserCache] Cached wallet ${addr} → (no user found)`);
    }

    return userId;
  } catch (err) {
    console.warn(`   ⚠️  [UserCache] Lookup failed for ${addr}:`, err.message);
    return null;
  }
}

/**
 * Manually link a wallet to a userId (called after a new user links their wallet).
 * Keeps the cache consistent without requiring a Firestore round-trip.
 *
 * @param {string} walletAddress
 * @param {string} userId
 */
function setUserCache(walletAddress, userId) {
  cache.set(walletAddress.toLowerCase(), userId);
}

module.exports = { getUserIdByWallet, setUserCache };
