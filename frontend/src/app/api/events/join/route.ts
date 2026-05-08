import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      const { initError } = require("@/lib/firebase-admin");
      return NextResponse.json(
        { 
          error: "Server configuration error: Firebase Admin not initialized.",
          details: initError || "Unknown initialization failure."
        },
        { status: 500 }
      );
    }

    const { eventId, userId, userName, userEmail = "", ticketId = "" } = await req.json();

    if (!eventId || !userId || !userName) {
      return NextResponse.json(
        { error: "Missing required fields (eventId, userId, userName)." },
        { status: 400 }
      );
    }

    // Ideally, we would also verify an auth token here to ensure the requester is `userId`.
    // Example: const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    // await adminAuth.verifyIdToken(token);

    const eventRef = adminDb.collection("events").doc(eventId);
    const volunteerRef = eventRef.collection("volunteers").doc(); // auto-ID
    const userRegistrationRef = adminDb.collection("users").doc(userId).collection("registrations").doc(eventId);

    // Execute atomic transaction for the volunteer signup
    await adminDb.runTransaction(async (transaction) => {
      const eventSnap = await transaction.get(eventRef);
      
      if (!eventSnap.exists) {
        throw new Error("Event not found");
      }

      const eventData = eventSnap.data();
      const currentVolunteers = eventData?.needs?.volunteers?.current || 0;
      const volunteerGoal = eventData?.needs?.volunteers?.goal;

      // Optional: Prevent signup if full
      if (volunteerGoal && currentVolunteers >= volunteerGoal) {
        throw new Error("Event has reached its volunteer capacity");
      }

      // 1. Update event document
      transaction.update(eventRef, {
        "needs.volunteers.current": currentVolunteers + 1,
        updatedAt: new Date()
      });

      // 2. Add to event's volunteers subcollection
      transaction.set(volunteerRef, {
        userId,
        userName,
        userEmail,
        ticketId,
        signedUpAt: new Date()
      });

      // 3. Add to user's registrations subcollection
      transaction.set(userRegistrationRef, {
        eventId,
        ticketId,
        signedUpAt: new Date(),
        status: "registered"
      });
    });

    return NextResponse.json({ success: true, message: "Successfully signed up for event" });
  } catch (error: any) {
    console.error("API /events/join Error:", error);
    const status = error.message === "Event not found" || error.message.includes("capacity") ? 400 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to process volunteer signup" },
      { status }
    );
  }
}
