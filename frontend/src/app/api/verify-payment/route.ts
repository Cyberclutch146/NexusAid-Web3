// src/app/api/verify-payment/route.ts
// Server-side payment verification and donation recording.
// Handles both Razorpay (with HMAC signature check) and crypto donations.

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { sendDonationReceipt } from '@/services/emailService';
import { FieldValue } from 'firebase-admin/firestore';

/** Generates a human-readable receipt ID: NXA-YYYY-XXXXXXXX */
function generateReceiptId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `NXA-${year}-${random}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RazorpayPayload {
  method: 'razorpay';
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  amount: number;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
}

interface CryptoPayload {
  method: 'crypto';
  txHash: string;
  walletAddress: string;
  amount: string; // in ETH/MATIC (string to avoid float issues)
  chainId: number;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
}

type VerifyPayload = RazorpayPayload | CryptoPayload;

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not configured. Add serviceAccountKey.json or FIREBASE_PRIVATE_KEY env var.' },
        { status: 503 }
      );
    }

    const body: VerifyPayload = await request.json();

    if (body.method === 'razorpay') {
      // ── 1. Verify Razorpay HMAC signature ──────────────────────────────────
      const secret = process.env.RAZORPAY_KEY_SECRET!;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`)
        .digest('hex');

      if (expectedSignature !== body.razorpaySignature) {
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
      }

      // ── 2. Record the verified donation ────────────────────────────────────
      const receiptId = generateReceiptId();
      const payload = {
        eventId: body.eventId,
        eventTitle: body.eventTitle,
        userId: body.userId,
        userName: body.userName,
        userEmail: body.userEmail,
        amount: body.amount,
        currency: 'INR',
        method: 'razorpay',
        razorpayPaymentId: body.razorpayPaymentId,
        razorpayOrderId: body.razorpayOrderId,
        receiptId,
        createdAt: FieldValue.serverTimestamp(),
      };

      // Write to events/{eventId}/donations and users/{userId}/donations
      const eventDonRef = adminDb.collection(`events/${body.eventId}/donations`).doc();
      const userDonRef = adminDb.collection(`users/${body.userId}/donations`).doc();
      const eventRef = adminDb.collection('events').doc(body.eventId);
      const userRef = adminDb.collection('users').doc(body.userId);

      await adminDb.runTransaction(async (t) => {
        // Write donation records
        t.set(eventDonRef, payload);
        t.set(userDonRef, { ...payload, eventDonationId: eventDonRef.id });

        // Increment event funds
        t.update(eventRef, {
          'needs.funds.current': FieldValue.increment(body.amount),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Increment user totalDonated (stored as USD)
        t.update(userRef, {
          totalDonated: FieldValue.increment(body.amount),
        });
      });

      // ── 3. Send receipt email (best-effort, don't block response) ──────────
      sendDonationReceipt({
        to: body.userEmail,
        userName: body.userName,
        eventTitle: body.eventTitle,
        amount: `₹${body.amount.toLocaleString('en-IN')}`,
        method: 'Razorpay (Fiat)',
        reference: body.razorpayPaymentId,
        receiptId,
      }).catch((e) => console.error('Receipt email failed:', e));

      return NextResponse.json({ success: true, receiptId });

    } else if (body.method === 'crypto') {
      // ── Crypto donation recording (no signature check needed — tx is on-chain) ──
      const receiptId = generateReceiptId();
      const amountNum = parseFloat(body.amount);
      const currency = body.chainId === 80002 || body.chainId === 137 ? 'MATIC' : 'ETH';

      const payload = {
        eventId: body.eventId,
        eventTitle: body.eventTitle,
        userId: body.userId,
        userName: body.userName,
        userEmail: body.userEmail,
        amount: amountNum,
        currency,
        method: 'crypto',
        txHash: body.txHash,
        walletAddress: body.walletAddress,
        chainId: body.chainId,
        receiptId,
        createdAt: FieldValue.serverTimestamp(),
      };

      const eventDonRef = adminDb.collection(`events/${body.eventId}/donations`).doc();
      const userDonRef = adminDb.collection(`users/${body.userId}/donations`).doc();
      const userRef = adminDb.collection('users').doc(body.userId);

      await adminDb.runTransaction(async (t) => {
        t.set(eventDonRef, payload);
        t.set(userDonRef, { ...payload, eventDonationId: eventDonRef.id });
        // Rough USD conversion for totalDonated display
        t.update(userRef, {
          totalDonated: FieldValue.increment(amountNum * 2500),
        });
      });

      // Send receipt email
      const explorerBase = body.chainId === 80002
        ? 'https://amoy.polygonscan.com/tx'
        : body.chainId === 31337
        ? 'http://localhost:8545'
        : `https://polygonscan.com/tx`;

      sendDonationReceipt({
        to: body.userEmail,
        userName: body.userName,
        eventTitle: body.eventTitle,
        amount: `${body.amount} ${currency}`,
        method: 'Crypto (MetaMask)',
        reference: body.txHash,
        receiptId,
        explorerUrl: `${explorerBase}/${body.txHash}`,
      }).catch((e) => console.error('Receipt email failed:', e));

      return NextResponse.json({ success: true, receiptId });
    }

    return NextResponse.json({ error: 'Invalid method' }, { status: 400 });

  } catch (error: any) {
    console.error('verify-payment error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
