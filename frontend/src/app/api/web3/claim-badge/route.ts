import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { adminDb, adminStorage, adminAuth } from '@/lib/firebase-admin';
import { REPUTATION_ABI } from '@/lib/web3/reputationContract';

const RPC_URL           = process.env.POLYGON_AMOY_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_CONTRACT!;
const DEPLOYER_KEY       = process.env.DEPLOYER_PRIVATE_KEY!;

function getServerSigner() {
  const provider = new JsonRpcProvider(RPC_URL);
  return new Wallet(DEPLOYER_KEY, provider);
}

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

async function uploadMetadataToFirebase(badgeType: string, recipientAddress: string, reason: string): Promise<string> {
  const meta = BADGE_META[badgeType] || {
    name: badgeType.replace(/_/g, ' '),
    description: reason,
    emoji: '⭐',
  };

  const metadata = {
    name: `NexusAid — ${meta.name}`,
    description: meta.description,
    reason,
    badgeType,
    recipient: recipientAddress,
    issuer: 'NexusAid Platform',
    platform: 'https://nexusaid.app',
    network: 'Polygon / Hardhat Local',
    timestamp: new Date().toISOString(),
    image: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='50%' x='50%' dominant-baseline='middle' text-anchor='middle' font-size='60'>${meta.emoji}</text></svg>`,
  };

  // Try Firebase Storage first; fall back to a data-URI if bucket not configured
  if (adminStorage) {
    try {
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET
        || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      const bucket = bucketName ? adminStorage.bucket(bucketName) : adminStorage.bucket();
      const timestamp = Date.now();
      const jsonFile = bucket.file(`badges/${recipientAddress.toLowerCase()}/${badgeType}-${timestamp}.json`);
      await jsonFile.save(JSON.stringify(metadata, null, 2), {
        metadata: { contentType: 'application/json' },
        public: true,
      });
      return jsonFile.publicUrl();
    } catch (err: any) {
      console.warn('[claim-badge] Storage upload failed, using inline metadata:', err.message);
    }
  }

  // Fallback: encode metadata as a data URI (works without any Storage bucket)
  const encoded = Buffer.from(JSON.stringify(metadata)).toString('base64');
  return `data:application/json;base64,${encoded}`;
}


export async function POST(req: NextRequest) {
  try {
    const { recipientAddress } = await req.json();

    if (!recipientAddress) {
      return NextResponse.json({ error: 'recipientAddress is required' }, { status: 400 });
    }

    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 503 });
    }

    // ─── Authenticate Firebase user ────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userId = decoded.uid;

    // 1. Fetch User Metrics
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    const volunteerHours = userData?.volunteerHours || 0;
    const existingBadges: any[] = userData?.badges || [];
    const ownedBadgeTypes = new Set(existingBadges.map((b: any) => b.badgeType));

    // Start with totalDonated from the user's own profile
    let totalDonated: number = parseFloat(userData?.totalDonated) || 0;

    // Also check if there is a wallet stub (created when user donated before linking)
    const recipientLower = recipientAddress.toLowerCase();
    const stubSnap = await adminDb.collection('users').doc(`wallet_${recipientLower}`).get();
    if (stubSnap.exists) {
      const stubDonated = parseFloat(stubSnap.data()?.totalDonated) || 0;
      totalDonated += stubDonated;
      // Merge the stub's totalDonated into the real user profile and delete the stub
      await userRef.set({
        totalDonated: adminDb.constructor.name === 'Firestore'
          ? totalDonated  // plain number merge
          : totalDonated,
        walletAddress: recipientLower,
      }, { merge: true });
      await stubSnap.ref.delete();
      console.log(`[claim-badge] Merged wallet stub (+${stubDonated} ETH) into user ${userId}`);
    }


    const eligibleBadges: string[] = [];

    // first_donation: any on-chain donation
    if (totalDonated > 0 && !ownedBadgeTypes.has('first_donation')) {
      eligibleBadges.push('first_donation');
    }

    // Tiers awarded by EITHER volunteer hours OR total ETH donated
    if ((volunteerHours >= 5 || totalDonated >= 0.01) && !ownedBadgeTypes.has('bronze'))
      eligibleBadges.push('bronze');
    if ((volunteerHours >= 20 || totalDonated >= 0.05) && !ownedBadgeTypes.has('silver'))
      eligibleBadges.push('silver');
    if ((volunteerHours >= 35 || totalDonated >= 0.1) && !ownedBadgeTypes.has('gold'))
      eligibleBadges.push('gold');
    if ((volunteerHours >= 60 || totalDonated >= 0.5) && !ownedBadgeTypes.has('platinum'))
      eligibleBadges.push('platinum');
    if ((volunteerHours >= 100 || totalDonated >= 1.0) && !ownedBadgeTypes.has('master'))
      eligibleBadges.push('master');


    if (eligibleBadges.length === 0) {
      return NextResponse.json({ success: true, message: 'No new eligible badges found.', claimed: [] });
    }

    // 2. Process Eligible Badges
    const signer = getServerSigner();
    const contract = new Contract(REPUTATION_ADDRESS, REPUTATION_ABI, signer);
    const claimedDetails = [];

    for (const badgeType of eligibleBadges) {
      const reason = `Awarded for contributing ${volunteerHours} hours and donating $${totalDonated}`;
      
      // Upload Metadata to Firebase Storage
      const metadataUri = await uploadMetadataToFirebase(badgeType, recipientAddress, reason);
      
      // Mint on-chain
      const tx = await contract.mintBadge(recipientAddress, badgeType, metadataUri);
      const receipt = await tx.wait();

      const mintEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'BadgeMinted';
        } catch { return false; }
      });
      
      const parsed = mintEvent ? contract.interface.parseLog(mintEvent) : null;
      const tokenId = parsed ? Number(parsed.args.tokenId) : null;

      if (tokenId !== null) {
        const newBadge = {
          tokenId,
          badgeType,
          mintedAt: new Date().toISOString(),
          txHash: receipt.hash,
        };
        existingBadges.push(newBadge);
        claimedDetails.push(newBadge);
      }
    }

    // 3. Update User Profile in DB
    if (claimedDetails.length > 0) {
      await userRef.set({
        badges: existingBadges,
        updatedAt: new Date(),
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${claimedDetails.length} badges!`,
      claimed: claimedDetails
    });

  } catch (error: any) {
    console.error('[claim-badge] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
