'use strict';

/**
 * escrowListener.js
 * Subscribes to NexusEscrow contract events and writes structured records
 * to Firestore in real-time.
 *
 * Events handled:
 *   - CampaignCreated    → events/{firebaseEventId} (merge escrow data)
 *   - DonationReceived   → donations/{auto-id}  +  escrows/{campaignId}
 *   - MilestoneProposed  → escrows/{campaignId}/milestones/{idx}
 *   - MilestoneApproved  → escrows/{campaignId}/milestones/{idx}
 *   - CampaignAbandoned  → escrows/{campaignId}
 *   - RefundIssued       → refunds/{auto-id}
 */

const { formatEther } = require('ethers');
const { admin, db } = require('../config/firebase');
const { escrowContract } = require('../config/contracts');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function extractLogMeta(eventOrLog) {
  const log = eventOrLog.log ?? eventOrLog;
  return {
    txHash:      log?.transactionHash ?? null,
    blockNumber: typeof log?.blockNumber === 'number' ? log.blockNumber : null,
  };
}

// ─── CampaignCreated ──────────────────────────────────────────────────────────
escrowContract.on('CampaignCreated', async (id, firebaseEventId, organizer, milestoneCount, eventObj) => {
  const { txHash, blockNumber } = extractLogMeta(eventObj);
  const campaignIdStr = id.toString();

  console.log(`\n🔐 [Escrow] CampaignCreated — On-chain ID: ${campaignIdStr} | Firebase: ${firebaseEventId}`);

  try {
    const batch = db.batch();

    // Update the Firebase event document with escrow data
    const eventRef = db.collection('events').doc(firebaseEventId);
    batch.set(eventRef, {
      escrowCampaignId:    campaignIdStr,
      escrowOrganizerWallet: organizer.toLowerCase(),
      escrowLinked:        true,
      milestoneCount:      milestoneCount,
      escrowLinkedAt:      admin.firestore.FieldValue.serverTimestamp(),
      escrowCreatedTxHash: txHash,
      escrowCreatedBlock:  blockNumber,
    }, { merge: true });

    // Create an escrows tracking document
    const escrowRef = db.collection('escrows').doc(campaignIdStr);
    batch.set(escrowRef, {
      campaignId:      campaignIdStr,
      firebaseEventId,
      organizer:       organizer.toLowerCase(),
      milestoneCount:  milestoneCount,
      totalRaised:     '0',
      totalReleased:   '0',
      status:          'active',
      createdAt:       admin.firestore.FieldValue.serverTimestamp(),
      txHash,
      blockNumber,
    });

    await batch.commit();
    console.log(`   ✅ Escrow doc created for campaign ${campaignIdStr}`);
  } catch (err) {
    console.error('   ❌ Failed to write Escrow CampaignCreated to Firestore:', err);
  }
});

// ─── DonationReceived ─────────────────────────────────────────────────────────
escrowContract.on('DonationReceived', async (campaignId, donor, amount, eventObj) => {
  const { txHash, blockNumber } = extractLogMeta(eventObj);
  const campaignIdStr = campaignId.toString();

  console.log(`\n💰 [Escrow] DonationReceived — Campaign #${campaignIdStr} | Donor: ${donor} | Amount: ${formatEther(amount)} MATIC`);

  try {
    const batch = db.batch();

    // Create a donation record
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
      contract:    'NexusEscrow',
    });

    // Increment totalRaised on the escrow doc
    const escrowRef = db.collection('escrows').doc(campaignIdStr);
    batch.set(escrowRef, {
      lastDonationAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await batch.commit();
    console.log(`   ✅ Escrow donation doc created: ${donationRef.id}`);
  } catch (err) {
    console.error('   ❌ Failed to write DonationReceived to Firestore:', err);
  }
});

// ─── MilestoneProposed ────────────────────────────────────────────────────────
escrowContract.on('MilestoneProposed', async (campaignId, milestoneIndex, evidenceCID, eventObj) => {
  const { txHash, blockNumber } = extractLogMeta(eventObj);
  const campaignIdStr = campaignId.toString();
  const milestoneIdx  = typeof milestoneIndex === 'bigint' ? Number(milestoneIndex) : milestoneIndex;
  const evidenceCIDStr = typeof evidenceCID === 'string' ? evidenceCID : '';

  console.log(`\n📋 [Escrow] MilestoneProposed — Campaign #${campaignIdStr} | Milestone: ${milestoneIdx}${evidenceCIDStr ? ` | Evidence: ${evidenceCIDStr}` : ''}`);

  try {
    const milestoneRef = db
      .collection('escrows').doc(campaignIdStr)
      .collection('milestones').doc(String(milestoneIdx));

    await milestoneRef.set({
      index:        milestoneIdx,
      status:       'proposed',
      evidenceCID:  evidenceCIDStr || null,
      evidenceURL:  evidenceCIDStr ? `https://gateway.pinata.cloud/ipfs/${evidenceCIDStr}` : null,
      proposedAt:   admin.firestore.FieldValue.serverTimestamp(),
      proposeTxHash: txHash,
      proposeBlock:  blockNumber,
    }, { merge: true });

    console.log(`   ✅ Milestone ${milestoneIdx} marked as proposed${evidenceCIDStr ? ` (evidence: ${evidenceCIDStr})` : ''}`);
  } catch (err) {
    console.error('   ❌ Failed to write MilestoneProposed to Firestore:', err);
  }
});

// ─── MilestoneApproved ────────────────────────────────────────────────────────
escrowContract.on('MilestoneApproved', async (campaignId, milestoneIndex, released, eventObj) => {
  const { txHash, blockNumber } = extractLogMeta(eventObj);
  const campaignIdStr = campaignId.toString();
  const milestoneIdx  = typeof milestoneIndex === 'bigint' ? Number(milestoneIndex) : milestoneIndex;

  console.log(`\n✅ [Escrow] MilestoneApproved — Campaign #${campaignIdStr} | Milestone: ${milestoneIdx} | Released: ${formatEther(released)} MATIC`);

  try {
    const batch = db.batch();

    const milestoneRef = db
      .collection('escrows').doc(campaignIdStr)
      .collection('milestones').doc(String(milestoneIdx));

    batch.set(milestoneRef, {
      status:          'approved',
      releasedAmount:  formatEther(released),
      releasedWei:     released.toString(),
      approvedAt:      admin.firestore.FieldValue.serverTimestamp(),
      approveTxHash:   txHash,
      approveBlock:    blockNumber,
    }, { merge: true });

    // Update escrow doc with latest released amount
    const escrowRef = db.collection('escrows').doc(campaignIdStr);
    batch.set(escrowRef, {
      lastApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await batch.commit();
    console.log(`   ✅ Milestone ${milestoneIdx} approved, ${formatEther(released)} MATIC released`);
  } catch (err) {
    console.error('   ❌ Failed to write MilestoneApproved to Firestore:', err);
  }
});

// ─── CampaignAbandoned ────────────────────────────────────────────────────────
escrowContract.on('CampaignAbandoned', async (campaignId, eventObj) => {
  const { txHash, blockNumber } = extractLogMeta(eventObj);
  const campaignIdStr = campaignId.toString();

  console.log(`\n🚫 [Escrow] CampaignAbandoned — Campaign #${campaignIdStr}`);

  try {
    const batch = db.batch();

    const escrowRef = db.collection('escrows').doc(campaignIdStr);
    batch.set(escrowRef, {
      status:        'abandoned',
      abandonedAt:   admin.firestore.FieldValue.serverTimestamp(),
      abandonTxHash: txHash,
      abandonBlock:  blockNumber,
    }, { merge: true });

    // Find the linked Firebase event and update its status
    const snapshot = await db
      .collection('events')
      .where('escrowCampaignId', '==', campaignIdStr)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      batch.set(snapshot.docs[0].ref, {
        escrowStatus: 'abandoned',
        abandonedAt:  admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();
    console.log(`   ✅ Escrow campaign ${campaignIdStr} marked as abandoned`);
  } catch (err) {
    console.error('   ❌ Failed to write CampaignAbandoned to Firestore:', err);
  }
});

// ─── RefundIssued ────────────────────────────────────────────────────────────
escrowContract.on('RefundIssued', async (campaignId, donor, amount, eventObj) => {
  const { txHash, blockNumber } = extractLogMeta(eventObj);
  const campaignIdStr = campaignId.toString();

  console.log(`\n↩️  [Escrow] RefundIssued — Campaign #${campaignIdStr} | Donor: ${donor} | Amount: ${formatEther(amount)} MATIC`);

  try {
    await db.collection('refunds').doc().set({
      campaignId:  campaignIdStr,
      donor:       donor.toLowerCase(),
      amount:      formatEther(amount),
      amountWei:   amount.toString(),
      txHash,
      blockNumber,
      timestamp:   admin.firestore.FieldValue.serverTimestamp(),
      source:      'blockchain',
    });

    console.log(`   ✅ Refund doc created for donor ${donor}`);
  } catch (err) {
    console.error('   ❌ Failed to write RefundIssued to Firestore:', err);
  }
});

console.log('👂 NexusEscrow listener attached (CampaignCreated, DonationReceived, MilestoneProposed, MilestoneApproved, CampaignAbandoned, RefundIssued)');
