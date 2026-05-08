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

    const { eventId, volunteerId, attended } = await req.json();

    if (!eventId || !volunteerId || typeof attended !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields (eventId, volunteerId, attended)." },
        { status: 400 }
      );
    }

    const volunteerRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("volunteers")
      .doc(volunteerId);

    const volunteerSnap = await volunteerRef.get();
    if (!volunteerSnap.exists) {
      return NextResponse.json(
        { error: "Volunteer record not found." },
        { status: 404 }
      );
    }

    await volunteerRef.update({
      attended,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Attendance updated." });
  } catch (error: any) {
    console.error("API /events/scan Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update attendance" },
      { status: 500 }
    );
  }
}
