import { NextRequest, NextResponse } from "next/server";
import { sendRegistrationEmail } from "@/services/emailService";

export async function POST(req: NextRequest) {
  try {
    const { email, eventTitle, ticketId } = await req.json();

    if (!email || !eventTitle || !ticketId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await sendRegistrationEmail(email, eventTitle, ticketId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Confirmation Email API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send confirmation email" }, { status: 500 });
  }
}
