import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { addVolunteerSignupServer } from "@/services/eventServiceServer";

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

    try {
      await addVolunteerSignupServer(eventId, userId, userName, userEmail, ticketId);
    } catch (error: any) {
      const status = error.message === "Event not found" || error.message.includes("capacity") ? 400 : 500;
      return NextResponse.json(
        { error: error.message || "Failed to process volunteer signup" },
        { status }
      );
    }

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
