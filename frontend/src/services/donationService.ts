// src/services/donationService.ts
// Unified donation tracking for both Razorpay (fiat) and crypto donations.

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DonationMethod = 'razorpay' | 'crypto';
export type DonationCurrency = 'INR' | 'ETH' | 'MATIC';

export interface DonationRecord {
  id?: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: DonationCurrency;
  method: DonationMethod;
  // Razorpay-specific
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  // Crypto-specific
  txHash?: string;
  walletAddress?: string;
  chainId?: number;
  // Receipt
  receiptId: string;
  createdAt?: Timestamp;
}

// ─── Receipt ID Generator ────────────────────────────────────────────────────

/**
 * Generates a human-readable receipt ID: NXA-YYYY-XXXXXXXX
 * e.g. NXA-2026-A3F7C2B1
 */
export function generateReceiptId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `NXA-${year}-${random}`;
}

// ─── Record Donation ─────────────────────────────────────────────────────────

/**
 * Records a donation in Firestore:
 * 1. Writes to `events/{eventId}/donations/{id}`
 * 2. Writes to `users/{userId}/donations/{id}`
 * 3. Atomically increments `needs.funds.current` on the event document
 */
export const recordDonation = async (data: Omit<DonationRecord, 'id' | 'createdAt'>): Promise<string> => {
  const eventRef = doc(db, 'events', data.eventId);
  const eventDonationsRef = collection(db, `events/${data.eventId}/donations`);
  const userDonationsRef = collection(db, `users/${data.userId}/donations`);

  const payload = {
    ...data,
    createdAt: serverTimestamp(),
  };

  // Write event-level donation record
  const eventDonationDoc = await addDoc(eventDonationsRef, payload);

  // Write user-level donation record (same ID for easy cross-referencing)
  await addDoc(userDonationsRef, {
    ...payload,
    eventDonationId: eventDonationDoc.id,
  });

  // Atomically increment the event's fund counter (only for fiat, ETH has its own counter on-chain)
  if (data.method === 'razorpay') {
    await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists()) return;
      const current = eventSnap.data()?.needs?.funds?.current ?? 0;
      transaction.update(eventRef, {
        'needs.funds.current': current + data.amount,
        updatedAt: serverTimestamp(),
      });
    });
  }

  // Update user's totalDonated aggregate (best-effort)
  try {
    const userRef = doc(db, 'users', data.userId);
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) return;
      const current = userSnap.data()?.totalDonated ?? 0;
      // For crypto, do a rough USD conversion at $2500/ETH for display only
      const usdEquivalent = data.currency === 'INR' ? data.amount : data.amount * 2500;
      transaction.update(userRef, {
        totalDonated: current + usdEquivalent,
      });
    });
  } catch {
    // non-critical — profile counter is cosmetic
  }

  return eventDonationDoc.id;
};

// ─── Query Donations ─────────────────────────────────────────────────────────

/** Fetches the full donation history for a user (newest first) */
export const getUserDonations = async (userId: string): Promise<DonationRecord[]> => {
  const ref = collection(db, `users/${userId}/donations`);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DonationRecord));
};

/** Fetches all donations for an event (newest first) */
export const getEventDonations = async (eventId: string): Promise<DonationRecord[]> => {
  const ref = collection(db, `events/${eventId}/donations`);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DonationRecord));
};
