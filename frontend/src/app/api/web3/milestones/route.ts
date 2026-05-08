// src/app/api/web3/milestones/route.ts
// Server-side milestone management for NexusEscrow campaigns.
// Uses the deployer private key to submit on-chain transactions.
// Firebase auth + Firestore ownership verification enforced.

import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { ESCROW_ABI } from '@/lib/web3/escrowContract';
import { ADMIN_EMAILS } from '@/services/eventService';

const AMOY_RPC = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT!;
const DEPLOYER_KEY   = process.env.DEPLOYER_PRIVATE_KEY!;

function getServerSigner() {
  const provider = new JsonRpcProvider(AMOY_RPC);
  return new Wallet(DEPLOYER_KEY, provider);
}

export async function POST(req: NextRequest) {
  try {
    const { action, campaignId, milestoneIndex } = await req.json();

    // ─── Validate inputs ─────────────────────────────────────────
    if (!action || campaignId === undefined || milestoneIndex === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!ESCROW_ADDRESS || ESCROW_ADDRESS === 'undefined') {
      return NextResponse.json({ error: 'Escrow contract not deployed' }, { status: 503 });
    }
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 503 });
    }

    // ─── Authenticate Firebase user ───────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decoded  = await adminAuth.verifyIdToken(idToken);
    const userId   = decoded.uid;
    const email    = decoded.email || '';

    const signer   = getServerSigner();
    const contract = new Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);

    // ─── Action: Propose (organizer-only) ────────────────────────
    if (action === 'propose') {
      // Verify user is the campaign organizer in Firestore
      const campaignSnap = await adminDb
        .collection('events')
        .where('escrowCampaignId', '==', campaignId)
        .limit(1)
        .get();

      if (campaignSnap.empty) {
        return NextResponse.json({ error: 'Campaign not found in Firestore' }, { status: 404 });
      }

      const campaignData = campaignSnap.docs[0].data();
      if (campaignData.organizerId !== userId) {
        return NextResponse.json({ error: 'Only the organizer can propose milestones' }, { status: 403 });
      }

      // Submit propose transaction using deployer wallet
      const tx = await contract.proposeMilestoneComplete(campaignId, milestoneIndex);
      const receipt = await tx.wait();

      // Update Firestore milestone status
      await campaignSnap.docs[0].ref.update({
        [`milestoneStatuses.${milestoneIndex}`]: 'proposed',
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        action: 'proposed',
        campaignId,
        milestoneIndex,
        txHash: receipt.hash,
      });
    }

    // ─── Action: Approve (admin-only) ─────────────────────────────
    if (action === 'approve') {
      if (!ADMIN_EMAILS.includes(email)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const tx = await contract.approveMilestone(campaignId, milestoneIndex);
      const receipt = await tx.wait();

      // Update Firestore milestone status
      const campaignSnap = await adminDb
        .collection('events')
        .where('escrowCampaignId', '==', campaignId)
        .limit(1)
        .get();

      if (!campaignSnap.empty) {
        await campaignSnap.docs[0].ref.update({
          [`milestoneStatuses.${milestoneIndex}`]: 'approved',
          updatedAt: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        action: 'approved',
        campaignId,
        milestoneIndex,
        txHash: receipt.hash,
      });
    }

    // ─── Action: Abandon (admin-only) ─────────────────────────────
    if (action === 'abandon') {
      if (!ADMIN_EMAILS.includes(email)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const tx = await contract.abandonCampaign(campaignId);
      const receipt = await tx.wait();

      return NextResponse.json({
        success: true,
        action: 'abandoned',
        campaignId,
        txHash: receipt.hash,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('[milestones] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
