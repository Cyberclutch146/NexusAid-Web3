// src/app/api/web3/link-wallet/route.ts
// Links a MetaMask wallet address to a Firebase user profile.
// Uses EIP-191 signed message verification to prove wallet ownership.

import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'ethers';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, signature, message } = await req.json();

    // ─── 1. Validate inputs ───────────────────────────────────────
    if (!walletAddress || !signature || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 503 });
    }

    // ─── 2. Authenticate Firebase user from Authorization header ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // ─── 3. Verify wallet signature (EIP-191) ────────────────────
    // The message must match what the frontend signed
    const recoveredAddress = verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 403 });
    }

    // ─── 4. Check wallet isn't already linked to another user ─────
    const existingUser = await adminDb
      .collection('users')
      .where('walletAddress', '==', walletAddress.toLowerCase())
      .limit(1)
      .get();

    if (!existingUser.empty && existingUser.docs[0].id !== userId) {
      return NextResponse.json(
        { error: 'Wallet already linked to another account' },
        { status: 409 }
      );
    }

    // ─── 5. Write to Firestore ────────────────────────────────────
    await adminDb.collection('users').doc(userId).set({
      walletAddress: walletAddress.toLowerCase(),
      walletLinkedAt: new Date().toISOString(),
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      walletAddress: walletAddress.toLowerCase(),
      userId,
    });
  } catch (error: any) {
    console.error('[link-wallet] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
