'use strict';

/**
 * reputationListener.js
 * Subscribes to NexusReputation contract events and writes badge records
 * to Firestore in real-time.
 *
 * Events handled:
 *   - BadgeMinted → users/{uid}/badges/{tokenId}  (by wallet lookup)
 *                 → badges/{tokenId}               (global index)
 */

const { admin, db } = require('../config/firebase');
const { reputationContract } = require('../config/contracts');
const { getUserIdByWallet } = require('../utils/userCache');

// ─── BadgeMinted ─────────────────────────────────────────────────────────────
reputationContract.on('BadgeMinted', async (recipient, tokenId, badgeType, timestamp, eventObj) => {
  const log = eventObj.log ?? eventObj;
  const txHash      = log?.transactionHash ?? null;
  const blockNumber = typeof log?.blockNumber === 'number' ? log.blockNumber : null;
  const tokenIdStr  = tokenId.toString();
  const recipientLC = recipient.toLowerCase();

  console.log(`\n🏅 [Reputation] BadgeMinted — Token: #${tokenIdStr} | Type: ${badgeType} | Recipient: ${recipient}`);

  try {
    const batch = db.batch();

    // 1. Global badge index — easy to query all badges
    const globalBadgeRef = db.collection('badges').doc(tokenIdStr);
    batch.set(globalBadgeRef, {
      tokenId:         tokenIdStr,
      badgeType,
      recipient:       recipientLC,
      mintedAt:        admin.firestore.FieldValue.serverTimestamp(),
      mintTimestamp:   Number(timestamp),
      txHash,
      blockNumber,
      source:          'blockchain',
    });

    // 2. Look up the Firebase user by wallet — use in-memory cache to avoid
    //    repeated Firestore queries for the same wallet address.
    try {
      const userId = await getUserIdByWallet(recipientLC, db);

      if (userId) {
        const badgeRef = db
          .collection('users').doc(userId)
          .collection('badges').doc(tokenIdStr);

        batch.set(badgeRef, {
          tokenId:    tokenIdStr,
          badgeType,
          mintedAt:   admin.firestore.FieldValue.serverTimestamp(),
          txHash,
          blockNumber,
        });

        // Increment the user's badge count and record highest tier
        batch.set(db.collection('users').doc(userId), {
          badgeCount:   admin.firestore.FieldValue.increment(1),
          latestBadge:  badgeType,
          lastBadgeAt:  admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`   ✅ Badge linked to Firebase user ${userId}`);
      } else {
        console.warn(`   ⚠️  No Firebase user found for wallet ${recipientLC} — badge stored in global index only`);
      }
    } catch (userLookupErr) {
      console.warn('   ⚠️  User lookup failed:', userLookupErr.message);
    }

    await batch.commit();
    console.log(`   ✅ Badge #${tokenIdStr} (${badgeType}) written to Firestore`);
  } catch (err) {
    console.error('   ❌ Failed to write BadgeMinted to Firestore:', err);
  }
});

console.log('👂 NexusReputation listener attached (BadgeMinted)');
