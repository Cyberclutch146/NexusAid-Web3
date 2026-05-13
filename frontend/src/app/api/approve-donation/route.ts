// src/app/api/approve-donation/route.ts
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { sendDonationReceipt } from '@/services/emailService';
import { FieldValue } from 'firebase-admin/firestore';
import { ADMIN_EMAILS } from '@/services/eventService';

/** Generates a human-readable receipt ID: NXA-YYYY-XXXXXXXX */
function generateReceiptId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `NXA-${year}-${random}`;
}

export async function POST(request: Request) {
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { error: 'Firebase Admin not configured.' },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: missing or invalid token' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const callerUid = decodedToken.uid;
    const callerEmail = decodedToken.email || '';

    const body = await request.json();
    const { eventId, pendingId, adminName } = body;

    if (!eventId || !pendingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Server-side gate: only ADMIN_EMAILS or the event's own organizer can approve
    if (!ADMIN_EMAILS.includes(callerEmail)) {
      const eventSnap = await adminDb.collection('events').doc(eventId).get();
      const organizerId = eventSnap.data()?.organizerId;
      if (organizerId !== callerUid) {
        return NextResponse.json(
          { error: 'Forbidden: only admins or the event organizer can approve donations' },
          { status: 403 }
        );
      }
    }

    // Fetch the pending donation
    const pendingRef = adminDb.collection(`events/${eventId}/pendingDonations`).doc(pendingId);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      return NextResponse.json({ error: 'Pending donation not found' }, { status: 404 });
    }

    const pendingData = pendingSnap.data()!;

    if (pendingData.status !== 'pending') {
      return NextResponse.json({ error: 'Donation is already processed' }, { status: 400 });
    }

    const receiptId = generateReceiptId();
    const payload = {
      eventId: pendingData.eventId,
      eventTitle: pendingData.eventTitle,
      userId: pendingData.userId,
      userName: pendingData.userName,
      userEmail: pendingData.userEmail,
      amount: pendingData.amount,
      currency: 'INR',
      method: 'cash', // Offline transfers represent cash/offline
      recordedBy: callerUid,
      recordedByName: adminName || callerEmail,
      reference: pendingData.reference,
      receiptId,
      createdAt: FieldValue.serverTimestamp(),
    };

    const eventDonRef = adminDb.collection(`events/${eventId}/donations`).doc();
    const userDonRef = adminDb.collection(`users/${pendingData.userId}/donations`).doc();
    const eventRef = adminDb.collection('events').doc(eventId);
    const userRef = adminDb.collection('users').doc(pendingData.userId);

    await adminDb.runTransaction(async (t) => {
      // Create the immutable donation records
      t.set(eventDonRef, payload);
      t.set(userDonRef, { ...payload, eventDonationId: eventDonRef.id });
      
      // Update event funds
      t.update(eventRef, {
        'needs.funds.current': FieldValue.increment(pendingData.amount),
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      // Update user total donated
      t.update(userRef, {
        totalDonated: FieldValue.increment(pendingData.amount),
      });

      // Mark the pending donation as approved
      t.update(pendingRef, {
        status: 'approved',
        updatedAt: FieldValue.serverTimestamp(),
        approvedBy: callerUid,
      });
    });

    // Send receipt to donor email (best-effort)
    sendDonationReceipt({
      to: pendingData.userEmail,
      userName: pendingData.userName,
      eventTitle: pendingData.eventTitle,
      amount: `₹${pendingData.amount.toLocaleString('en-IN')}`,
      method: 'Offline Transfer (Verified)',
      reference: pendingData.reference,
      receiptId,
    }).catch((e) => console.error('Cash receipt email failed:', e));

    return NextResponse.json({ success: true, receiptId });
  } catch (error: any) {
    console.error('approve-donation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
