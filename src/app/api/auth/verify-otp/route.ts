import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and verification code are required." }, { status: 400 });
    }

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

    const verificationRef = adminDb.collection("verifications").doc(email);
    const verificationSnap = await verificationRef.get();

    if (!verificationSnap.exists) {
      return NextResponse.json({ error: "No verification code found. Please request a new one." }, { status: 404 });
    }

    const data = verificationSnap.data()!;

    // Check if the OTP has expired
    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    if (new Date() > expiresAt) {
      await verificationRef.delete(); // Clean up expired OTP
      return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 410 });
    }

    // Check if the code matches
    if (data.code !== code) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 401 });
    }

    // Mark as verified and clean up
    await verificationRef.update({ verified: true });

    return NextResponse.json({ success: true, verified: true });
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ error: error.message || "Verification failed." }, { status: 500 });
  }
}
