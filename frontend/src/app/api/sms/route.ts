import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(req: Request) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: "Phone number and message are required." },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        {
          error:
            "Twilio credentials missing. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env.local.",
        },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    const sms = await client.messages.create({
      body: message,
      from: fromNumber,
      to,
    });

    return NextResponse.json({
      success: true,
      sid: sms.sid,
    });
  } catch (error: any) {
    console.error("TWILIO SMS ERROR:", {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
    });

    return NextResponse.json(
      {
        error: error.message || "Failed to send SMS.",
        code: error.code || null,
        moreInfo: error.moreInfo || null,
      },
      { status: 500 }
    );
  }
}