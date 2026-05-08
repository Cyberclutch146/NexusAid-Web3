import { NextRequest, NextResponse } from "next/server";
import { sendOTPEmail } from "@/services/emailService";
import { adminDb } from "@/lib/firebase-admin";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, eventTitle } = await req.json();

    if (!email || !eventTitle) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate OTP server-side using cryptographically secure random
    const code = crypto.randomInt(100000, 999999).toString();

    // Store OTP in Firestore with a 10-minute expiry
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

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await adminDb.collection("verifications").doc(email).set({
      code,
      eventTitle,
      expiresAt,
      verified: false,
      createdAt: new Date(),
    });

    // Send the OTP email
    await sendOTPEmail(email, code, eventTitle);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("OTP API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
  }
}
