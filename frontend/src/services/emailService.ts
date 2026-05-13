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
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">NexusAid &bull; Outreach &amp; Relief Coordination</p>
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
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">NexusAid &bull; Outreach &amp; Relief Coordination</p>
      </div>
    `
  });
};

// ─── Donation Receipt ────────────────────────────────────────────────────────

interface DonationReceiptOptions {
  to: string;
  userName: string;
  eventTitle: string;
  amount: string;       // e.g. "₹500" or "0.05 ETH"
  method: string;       // e.g. "Razorpay (Fiat)" or "Crypto (MetaMask)"
  reference: string;    // Razorpay payment ID or tx hash
  receiptId: string;    // e.g. "NXA-2026-A3F7C2B1"
  explorerUrl?: string; // Optional PolygonScan link for crypto
}

export const sendDonationReceipt = async (opts: DonationReceiptOptions) => {
  if (!transporter) {
    console.warn("Email skipped: Email credentials missing in environment variables.");
    return;
  }

  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'long',
    timeStyle: 'short',
  } as Intl.DateTimeFormatOptions);

  const referenceHtml = opts.explorerUrl
    ? `<a href="${opts.explorerUrl}" style="color: #3b6b4a; word-break: break-all;">${opts.reference}</a>`
    : `<span style="font-family: monospace; word-break: break-all;">${opts.reference}</span>`;

  return transporter.sendMail({
    from: `"NexusAid" <${process.env.EMAIL}>`,
    to: opts.to,
    subject: `Donation Receipt ${opts.receiptId} — ${opts.eventTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 16px;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b6b4a, #4e8b62); padding: 32px 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
          <p style="color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px 0;">NexusAid</p>
          <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 800;">Donation Receipt</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 14px;">${now}</p>
        </div>

        <!-- Receipt ID Badge -->
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="background: #fff; border: 2px solid #3b6b4a; color: #3b6b4a; font-family: monospace; font-size: 18px; font-weight: 800; padding: 8px 20px; border-radius: 8px; letter-spacing: 2px;">
            ${opts.receiptId}
          </span>
        </div>

        <!-- Details Card -->
        <div style="background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 12px 0; color: #6b7280; font-size: 13px; font-weight: 600;">Donor</td>
              <td style="padding: 12px 0; color: #111827; font-weight: 700; text-align: right;">${opts.userName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 12px 0; color: #6b7280; font-size: 13px; font-weight: 600;">Campaign</td>
              <td style="padding: 12px 0; color: #111827; font-weight: 700; text-align: right;">${opts.eventTitle}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 12px 0; color: #6b7280; font-size: 13px; font-weight: 600;">Amount</td>
              <td style="padding: 12px 0; color: #3b6b4a; font-weight: 800; font-size: 20px; text-align: right;">${opts.amount}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 12px 0; color: #6b7280; font-size: 13px; font-weight: 600;">Payment Method</td>
              <td style="padding: 12px 0; color: #111827; font-weight: 700; text-align: right;">${opts.method}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280; font-size: 13px; font-weight: 600;">Reference</td>
              <td style="padding: 12px 0; color: #111827; font-size: 12px; text-align: right;">${referenceHtml}</td>
            </tr>
          </table>
        </div>

        <!-- Thank You Note -->
        <div style="background: rgba(59,107,74,0.06); border-left: 4px solid #3b6b4a; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="color: #3b6b4a; font-weight: 700; margin: 0 0 4px 0;">Thank you for your generosity!</p>
          <p style="color: #4b5563; font-size: 13px; margin: 0; line-height: 1.6;">Your contribution to <strong>${opts.eventTitle}</strong> makes a real difference. Every donation is tracked transparently by NexusAid.</p>
        </div>

        <!-- Footer -->
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 0 0 16px 0;" />
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
          NexusAid &bull; Decentralized Disaster Relief &bull; This receipt is auto-generated and serves as proof of your donation.
        </p>
      </div>
    `,
  });
};
