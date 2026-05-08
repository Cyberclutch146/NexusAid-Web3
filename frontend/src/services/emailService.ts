import nodemailer from "nodemailer";

const transporter = process.env.EMAIL && process.env.EMAIL_PASS
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
      }
    })
  : null;

export const sendEmail = async (to: string, message: string) => {
  if (!transporter) {
    console.warn("Email skipped: Email credentials missing in environment variables.");
    return;
  }
  
  return transporter.sendMail({
    from: `"Campaign Team" <${process.env.EMAIL}>`,
    to,
    subject: "You're invited to support a campaign",
    text: message
  });
};

export const sendOTPEmail = async (to: string, code: string, eventTitle: string) => {
  if (!transporter) {
    console.warn("Email skipped: Email credentials missing in environment variables.");
    return;
  }

  return transporter.sendMail({
    from: `"NexusAid" <${process.env.EMAIL}>`,
    to,
    subject: `Verification Code: ${code} for ${eventTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #3b6b4a; margin-bottom: 16px;">Volunteer Verification</h2>
        <p style="color: #4b5563; line-height: 1.5;">You are signing up to volunteer for <strong>${eventTitle}</strong>. Please use the following code to verify your registration:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #111827;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">NexusAid &bull; Outreach & Relief Coordination</p>
      </div>
    `
  });
};

export const sendRegistrationEmail = async (to: string, eventTitle: string, ticketId: string) => {
  if (!transporter) {
    console.warn("Email skipped: Email credentials missing in environment variables.");
    return;
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticketId)}`;

  return transporter.sendMail({
    from: `"NexusAid" <${process.env.EMAIL}>`,
    to,
    subject: `Your Digital Ticket: ${eventTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #3b6b4a; margin-bottom: 8px;">Registration Confirmed!</h2>
        <p style="color: #4b5563; line-height: 1.5;">Thank you for volunteering for <strong>${eventTitle}</strong>. Your registration is confirmed.</p>
        
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
          <h3 style="color: #111827; margin-top: 0; margin-bottom: 16px;">Your Digital Ticket</h3>
          <img src="${qrUrl}" alt="Ticket QR Code" style="width: 200px; height: 200px; margin: 0 auto; display: block; border-radius: 8px;" />
          <p style="font-family: monospace; font-size: 20px; font-weight: bold; color: #3b6b4a; margin-top: 20px; letter-spacing: 2px;">${ticketId}</p>
        </div>

        <p style="color: #4b5563; font-size: 14px;">Please present this QR code or Ticket ID when you arrive at the event.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">NexusAid &bull; Outreach & Relief Coordination</p>
      </div>
    `
  });
};
