// src/app/api/web3/mint-badge/route.ts
// Server-side SBT minting for NexusReputation badges.
// Uses the deployer private key to mint on-chain; admin-only.

import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { REPUTATION_ABI } from '@/lib/web3/reputationContract';
import { ADMIN_EMAILS } from '@/services/eventService';

const AMOY_RPC          = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_CONTRACT!;
const DEPLOYER_KEY       = process.env.DEPLOYER_PRIVATE_KEY!;

function getServerSigner() {
  const provider = new JsonRpcProvider(AMOY_RPC);
  return new Wallet(DEPLOYER_KEY, provider);
}

function buildMetadataUri(badgeType: string, recipientAddress: string, reason: string): string {
  const BADGE_META: Record<string, { name: string; description: string; emoji: string }> = {
    bronze:         { name: 'Bronze Badge',   description: 'First steps in community impact',                   emoji: '🥉' },
    silver:         { name: 'Silver Badge',   description: 'Growing contributor to disaster relief',            emoji: '🥈' },
    gold:           { name: 'Gold Badge',     description: 'Established relief champion',                       emoji: '🥇' },
    platinum:       { name: 'Platinum Badge', description: 'Dedicated pillar of the NexusAid community',        emoji: '💠' },
    master:         { name: 'Master Badge',   description: 'Elite-tier disaster relief expert',                  emoji: '⚡' },
    diamond:        { name: 'Diamond Badge',  description: 'Exceptional — awarded for extraordinary service',    emoji: '💎' },
    first_donation: { name: 'First Donor',    description: 'Made their first on-chain donation to NexusAid',    emoji: '💚' },
    organizer:      { name: 'Organizer',      description: 'Successfully organized a NexusAid campaign',        emoji: '🏅' },
  };

  const meta = BADGE_META[badgeType] || {
    name:        badgeType.replace(/_/g, ' '),
    description: reason,
    emoji:       '⭐',
  };

  const metadata = {
    name:        `NexusAid — ${meta.name}`,
    description: meta.description,
    reason,
    badgeType,
    recipient:   recipientAddress,
    issuer:      'NexusAid Platform',
    platform:    'https://nexusaid.app',
    network:     'Polygon Amoy Testnet',
    timestamp:   new Date().toISOString(),
    image:       `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='50%' x='50%' dominant-baseline='middle' text-anchor='middle' font-size='60'>${meta.emoji}</text></svg>`,
  };

  return `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
}

export async function POST(req: NextRequest) {
  try {
    const { recipientAddress, badgeType, reason, targetUserId } = await req.json();

    // ─── Validate inputs ─────────────────────────────────────────
    if (!recipientAddress || !badgeType) {
      return NextResponse.json({ error: 'recipientAddress and badgeType are required' }, { status: 400 });
    }
    if (!REPUTATION_ADDRESS || REPUTATION_ADDRESS === 'undefined') {
      return NextResponse.json({ error: 'Reputation contract not deployed yet' }, { status: 503 });
    }
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 503 });
    }

    // ─── Admin authentication ─────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decoded  = await adminAuth.verifyIdToken(idToken);
    const email    = decoded.email || '';

    if (!ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: 'Admin access required to mint badges' }, { status: 403 });
    }

    // ─── Build metadata & mint on-chain ──────────────────────────
    const metadataUri = buildMetadataUri(badgeType, recipientAddress, reason || `${badgeType} badge`);
    const signer      = getServerSigner();
    const contract    = new Contract(REPUTATION_ADDRESS, REPUTATION_ABI, signer);

    const tx      = await contract.mintBadge(recipientAddress, badgeType, metadataUri);
    const receipt = await tx.wait();

    // Extract tokenId from the BadgeMinted event
    const mintEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'BadgeMinted';
      } catch { return false; }
    });
    const parsed  = mintEvent ? contract.interface.parseLog(mintEvent) : null;
    const tokenId = parsed ? Number(parsed.args.tokenId) : null;

    // ─── Sync badge to Firestore (if targetUserId given) ─────────
    if (targetUserId && tokenId !== null) {
      const newBadge = {
        tokenId,
        badgeType,
        mintedAt:  new Date().toISOString(),
        txHash:    receipt.hash,
      };
      const userRef = adminDb.collection('users').doc(targetUserId);
      const userSnap = await userRef.get();
      const existing: any[] = userSnap.data()?.badges || [];

      await userRef.set({
        badges:    [...existing, newBadge],
        updatedAt: new Date(),
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      tokenId,
      txHash:    receipt.hash,
      badgeType,
      recipient: recipientAddress,
      polygonScan: `https://amoy.polygonscan.com/tx/${receipt.hash}`,
    });
  } catch (error: any) {
    console.error('[mint-badge] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
