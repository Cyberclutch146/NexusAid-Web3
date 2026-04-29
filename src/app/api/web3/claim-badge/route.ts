import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { REPUTATION_ABI } from '@/lib/web3/reputationContract';

const AMOY_RPC          = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_CONTRACT!;
const DEPLOYER_KEY       = process.env.DEPLOYER_PRIVATE_KEY!;

function getServerSigner() {
  const provider = new JsonRpcProvider(AMOY_RPC);
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

async function uploadMetadataToFirebase(badgeType: string, recipientAddress: string, reason: string): string {
  if (!adminStorage) throw new Error("Firebase Admin Storage not initialized");
  
  const meta = BADGE_META[badgeType] || {
    name: badgeType.replace(/_/g, ' '),
    description: reason,
    emoji: '⭐',
  };

  const svgContent = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='50%' x='50%' dominant-baseline='middle' text-anchor='middle' font-size='60'>${meta.emoji}</text></svg>`;
  
  const metadata = {
    name: `NexusAid — ${meta.name}`,
    description: meta.description,
    reason,
    badgeType,
    recipient: recipientAddress,
    issuer: 'NexusAid Platform',
    platform: 'https://nexusaid.app',
    network: 'Polygon Amoy Testnet',
    timestamp: new Date().toISOString(),
    // We will update the image URL after uploading the SVG
    image: '', 
  };

  const bucket = adminStorage.bucket();
  const timestamp = Date.now();
  
  // Upload SVG
  const svgFile = bucket.file(`badges/${recipientAddress}/${badgeType}-${timestamp}.svg`);
  await svgFile.save(svgContent, {
    metadata: { contentType: 'image/svg+xml' },
    public: true
  });
  const svgUrl = svgFile.publicUrl();
  metadata.image = svgUrl;

  // Upload JSON
  const jsonFile = bucket.file(`badges/${recipientAddress}/${badgeType}-${timestamp}.json`);
  await jsonFile.save(JSON.stringify(metadata, null, 2), {
    metadata: { contentType: 'application/json' },
    public: true
  });
  
  return jsonFile.publicUrl();
}

export async function POST(req: NextRequest) {
  try {
    const { userId, recipientAddress } = await req.json();

    if (!userId || !recipientAddress) {
      return NextResponse.json({ error: 'userId and recipientAddress are required' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 503 });
    }

    // 1. Fetch User Metrics
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    const volunteerHours = userData?.volunteerHours || 0;
    const totalDonated = userData?.totalDonated || 0;
    const existingBadges: any[] = userData?.badges || [];
    const ownedBadgeTypes = new Set(existingBadges.map(b => b.badgeType));

    // For simplicity, we skip campaign count in this demo and focus on hours & donations
    const eligibleBadges: string[] = [];

    if (totalDonated > 0 && !ownedBadgeTypes.has('first_donation')) {
      eligibleBadges.push('first_donation');
    }

    if (volunteerHours >= 5 && !ownedBadgeTypes.has('bronze')) eligibleBadges.push('bronze');
    if (volunteerHours >= 20 && !ownedBadgeTypes.has('silver')) eligibleBadges.push('silver');
    if (volunteerHours >= 35 && !ownedBadgeTypes.has('gold')) eligibleBadges.push('gold');
    if (volunteerHours >= 60 && !ownedBadgeTypes.has('platinum')) eligibleBadges.push('platinum');
    if (volunteerHours >= 100 && !ownedBadgeTypes.has('master')) eligibleBadges.push('master');

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
      await userRef.update({
        badges: existingBadges,
        updatedAt: new Date(),
      });
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
