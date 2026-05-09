'use strict';

/**
 * donateListener.js
 * Subscribes to NexusDonate contract events and writes structured records
 * to Firestore in real-time.
 *
 * Events handled:
 *   - DonationMade     → donations/{auto-id}
 *   - CampaignCreated  → events/{firebaseEventId} (merge)
 *   - FundsWithdrawn   → events/{firebaseEventId}/withdrawals/{auto-id}
 */

const { formatEther } = require('ethers');
const { admin, db } = require('../config/firebase');
const { donateContract } = require('../config/contracts');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Safely extracts the tx hash and block number from an ethers v6 event object.
 * The log object is nested differently depending on how the event was emitted.
 */
function extractLogMeta(eventOrLog) {
  const log = eventOrLog.log ?? eventOrLog;
  return {
    txHash: log?.transactionHash ?? null,
    blockNumber: typeof log?.blockNumber === 'number' ? log.blockNumber : null,
  };
}

// ─── DonationMade ─────────────────────────────────────────────────────────────
donateContract.on('DonationMade', async (campaignId, donor, amount, eventObj) => {
  const { txHash, blockNumber } = extractLogMeta(eventObj);
  const campaignIdStr = campaignId.toString();

  console.log(`\n📥 DonationMade — Campaign #${campaignIdStr} | Donor: ${donor} | Amount: ${formatEther(amount)} ETH`);

  try {
    const batch = db.batch();

    // 1. Write a detailed donation record
    const donationRef = db.collection('donations').doc();
    batch.set(donationRef, {
      campaignId:  campaignIdStr,
      donor:       donor.toLowerCase(),
      amount:      formatEther(amount),
      amountWei:   amount.toString(),
      txHash,
      blockNumber,
      timestamp:   admin.firestore.FieldValue.serverTimestamp(),
      source:      'blockchain',
      contract:    'NexusDonate',
    });

    // 2. Look up the firebaseEventId from the campaign and update totalRaised
    try {
      const [firebaseEventId, , totalRaised] = await donateContract.getCampaign(campaignId);
      if (firebaseEventId) {
        const eventRef = db.collection('events').doc(firebaseEventId);
        batch.set(eventRef, {
          totalRaisedOnChain: formatEther(totalRaised),
          lastDonationAt:     admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    } catch (readErr) {
      console.warn('⚠️  Could not read campaign from chain to update event doc:', readErr.message);
    }

    await batch.commit();
    console.log(`   ✅ Donation doc created: ${donationRef.id}`);
  } catch (err) {
    console.error('   ❌ Failed to write DonationMade to Firestore:', err);
  }
});

// ─── CampaignCreated ──────────────────────────────────────────────────────────
donateContract.on('CampaignCreated', async (id, firebaseEventId, organizer, metadataCID, eventObj) => {
  const { txHash, blockNumber } = extractLogMeta(eventObj);
  const campaignIdStr = id.toString();
  const cid = typeof metadataCID === 'string' ? metadataCID : '';

  console.log(`\n🚀 CampaignCreated — On-chain ID: ${campaignIdStr} | Firebase: ${firebaseEventId} | CID: ${cid || 'none'}`);

  try {
    await db.collection('events').doc(firebaseEventId).set({
      blockchainCampaignId:  campaignIdStr,
      organizerWallet:       organizer.toLowerCase(),
      onChain:               true,
      donateContractLinked:  true,
      metadataCID:           cid || null,
      metadataURL:           cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : null,
      chainLinkedAt:         admin.firestore.FieldValue.serverTimestamp(),
      campaignCreatedTxHash: txHash,
      campaignCreatedBlock:  blockNumber,
    }, { merge: true });

    console.log(`   ✅ Event doc ${firebaseEventId} updated with blockchain campaign ID${cid ? ` and IPFS CID` : ''}`);
  } catch (err) {
    console.error('   ❌ Failed to write CampaignCreated to Firestore:', err);
  }
});

// ─── FundsWithdrawn ───────────────────────────────────────────────────────────
donateContract.on('FundsWithdrawn', async (campaignId, amount, eventObj) => {
  const { txHash, blockNumber } = extractLogMeta(eventObj);
  const campaignIdStr = campaignId.toString();

  console.log(`\n💸 FundsWithdrawn — Campaign #${campaignIdStr} | Amount: ${formatEther(amount)} ETH`);

  try {
    // Look up which Firebase event this campaign maps to
    const snapshot = await db
      .collection('events')
      .where('blockchainCampaignId', '==', campaignIdStr)
      .limit(1)
      .get();

    const batch = db.batch();

    if (!snapshot.empty) {
      const eventRef = snapshot.docs[0].ref;
      batch.set(eventRef, {
        fundsWithdrawn:       true,
        withdrawnAmount:      formatEther(amount),
        withdrawnAt:          admin.firestore.FieldValue.serverTimestamp(),
        withdrawTxHash:       txHash,
      }, { merge: true });
    }

    // Also log the withdrawal as a sub-document for audit trail
    const withdrawRef = db.collection('withdrawals').doc();
    batch.set(withdrawRef, {
      campaignId:  campaignIdStr,
      amount:      formatEther(amount),
      amountWei:   amount.toString(),
      txHash,
      blockNumber,
      timestamp:   admin.firestore.FieldValue.serverTimestamp(),
      source:      'blockchain',
    });

    await batch.commit();
    console.log(`   ✅ Withdrawal logged`);
  } catch (err) {
    console.error('   ❌ Failed to write FundsWithdrawn to Firestore:', err);
  }
});

console.log('👂 NexusDonate listener attached (DonationMade, CampaignCreated, FundsWithdrawn)');
