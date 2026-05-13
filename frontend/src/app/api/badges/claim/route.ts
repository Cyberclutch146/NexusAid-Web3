import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { REPUTATION_ABI, REPUTATION_ADDRESS } from '@/lib/web3/reputationContract';

export async function POST(request: Request) {
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not configured.' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: missing or invalid token' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const userRef = adminDb.collection('users').doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data()!;
    const walletAddress = userData.walletAddress;
    const totalDonated = userData.totalDonated || 0;

    if (!walletAddress) {
      return NextResponse.json({ error: 'No wallet linked to this profile. Link a wallet first.' }, { status: 400 });
    }

    // Determine eligible badges based on totalDonated
    const eligibleBadges: string[] = [];
    if (totalDonated > 0) eligibleBadges.push('first_donation');
    if (totalDonated >= 100) eligibleBadges.push('bronze');
    if (totalDonated >= 500) eligibleBadges.push('silver');
    if (totalDonated >= 1000) eligibleBadges.push('gold');
    if (totalDonated >= 5000) eligibleBadges.push('platinum');
    if (totalDonated >= 10000) eligibleBadges.push('master');

    if (eligibleBadges.length === 0) {
      return NextResponse.json({ message: 'No eligible badges to claim yet.', minted: [] });
    }

    // Setup Web3 Provider & Admin Wallet
    const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    
    if (!privateKey) {
       console.error("Missing DEPLOYER_PRIVATE_KEY in environment");
       return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const adminWallet = new Wallet(privateKey, provider);
    const reputationContract = new Contract(REPUTATION_ADDRESS, REPUTATION_ABI, adminWallet);

    // Get current on-chain badges
    const tokenIds: bigint[] = await reputationContract.getBadgesByOwner(walletAddress);
    
    const onChainTypes = new Set<string>();
    await Promise.all(tokenIds.map(async (id) => {
       const [badgeType] = await reputationContract.getBadgeInfo(id);
       onChainTypes.add(badgeType);
    }));

    // Find missing badges that need to be minted
    const toMint = eligibleBadges.filter(b => !onChainTypes.has(b));

    if (toMint.length === 0) {
      return NextResponse.json({ message: 'All eligible badges are already on-chain.', minted: [] });
    }

    // Mint missing badges
    const mintedList: string[] = [];
    let currentNonce = await adminWallet.getNonce();

    for (const badge of toMint) {
       // In a real app, this metadataURI points to IPFS containing the badge image/JSON
       const metadataURI = `ipfs://placeholder-for-${badge}`;
       
       // Pass explicit nonce to avoid "Nonce too low" errors when automining
       const tx = await reputationContract.mintBadge(walletAddress, badge, metadataURI, {
           nonce: currentNonce++
       });
       
       await tx.wait(); // Wait for confirmation
       mintedList.push(badge);
    }

    return NextResponse.json({ 
       success: true, 
       message: `Successfully claimed ${mintedList.length} badges on-chain!`,
       minted: mintedList
    });

  } catch (error: any) {
    console.error('Badge Claim API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
