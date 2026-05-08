import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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

    const { eventId, userId, userName, text } = await req.json();

    if (!eventId || !userId || !userName || !text) {
      return NextResponse.json(
        { error: "Missing required fields (eventId, userId, userName, text)." },
        { status: 400 }
      );
    }

    const messagesRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("messages");

    await messagesRef.add({
      eventId,
      userId,
      userName,
      text,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API /chat/send Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}
