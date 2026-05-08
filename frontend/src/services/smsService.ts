import twilio from "twilio";

const client = process.env.TWILIO_SID && process.env.TWILIO_AUTH 
  ? twilio(
      process.env.TWILIO_SID as string,
      process.env.TWILIO_AUTH as string
    )
  : null;

export const sendSMS = async (phone: string, message: string) => {
  if (!client) {
    console.warn("SMS skipped: Twilio credentials missing in environment variables.");
    return;
  }
  
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: `+91${phone}` // India format
    });
  } catch (err: any) {
    console.error("SMS failed:", phone, err.message);
    throw err;
  }
};