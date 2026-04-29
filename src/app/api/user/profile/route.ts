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

    const { action, userId, data } = await req.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: "Missing required fields (userId, action)." },
        { status: 400 }
      );
    }

    const userDocRef = adminDb.collection("users").doc(userId);

    if (action === "create") {
      await userDocRef.set({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return NextResponse.json({ success: true, message: "Profile created." });
    }

    if (action === "update") {
      await userDocRef.update({
        ...data,
        updatedAt: new Date(),
      });
      return NextResponse.json({ success: true, message: "Profile updated." });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("API /user/profile Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to manage user profile" },
      { status: 500 }
    );
  }
}
