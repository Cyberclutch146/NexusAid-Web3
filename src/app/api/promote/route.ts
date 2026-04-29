import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { sendEmail } from "@/services/emailService";
import { sendSMS } from "@/services/smsService";
import { adminDb } from "@/lib/firebase-admin";

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
    const db = adminDb;
    const formData = await req.formData();
    const message = formData.get("message") as string;
    const campaignId = formData.get("campaignId") as string;
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
      return NextResponse.json({ error: "Invalid file type. Please upload a .csv or .xlsx file." }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 🚀 Robust CSV/Excel Parsing
    console.log('API: Processing file:', file.name, 'Size:', file.size);

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet) as any[];

    const contacts: { email?: string, phone?: string }[] = [];
    const parsedData: any[] = [];

    rawData.forEach((row: any) => {
      // Create a lowercase keyed copy of the row for easier searching
      const lowerRow: any = {};
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          lowerRow[key.toLowerCase().trim()] = row[key];
        }
      }

      parsedData.push(lowerRow);

      // 🔍 Find the email and phone columns no matter what they are called
      const emailValue = lowerRow.email || lowerRow['email address'] || lowerRow.address || lowerRow.contact;
      const phoneValue = lowerRow.phone || lowerRow['phone number'] || lowerRow.mobile || lowerRow.contact;
      
      const contact: { email?: string, phone?: string } = {};

      if (emailValue) {
        const trimmedEmail = String(emailValue).trim();
        if (isValidEmail(trimmedEmail)) {
          contact.email = trimmedEmail;
        } else {
          console.log("API: Skipped invalid email format:", trimmedEmail);
        }
      }

      if (phoneValue) {
        const trimmedPhone = String(phoneValue).replace(/\D/g, ''); // Extract digits
        if (trimmedPhone.length >= 10) { // Basic validation
          // Assuming India format requires 10 digits
          contact.phone = trimmedPhone.slice(-10); 
        } else {
          console.log("API: Skipped invalid phone format:", trimmedPhone);
        }
      }

      if (contact.email || contact.phone) {
        contacts.push(contact);
      }
    });

    console.log("API: First Row Parsed:", parsedData[0]);

    if (contacts.length === 0) {
      return NextResponse.json({ 
        error: "No valid emails or phone numbers found in CSV",
        debug: {
          firstRowSeen: parsedData[0] || null
        }
      }, { status: 400 });
    }

    // 🚀 Send emails and SMS in parallel and log each one individually
    const results = await Promise.allSettled(
      contacts.map(async (contact) => {
        try {
          const tasks = [];
          if (contact.email) {
            tasks.push(sendEmail(contact.email, message));
          }
          if (contact.phone) {
            tasks.push(sendSMS(contact.phone, message));
          }
          await Promise.all(tasks);
          
          try {
            await db.collection("promotion_logs").add({
              campaignId: campaignId || "unknown",
              contact,
              status: "sent",
              createdAt: new Date()
            });
          } catch (logErr) {
            console.error(`Failed to log success for`, contact, `:`, logErr);
          }
          
          return contact;
        } catch (error: any) {
          try {
            await db.collection("promotion_logs").add({
              campaignId: campaignId || "unknown",
              contact,
              status: "failed",
              error: error.message || "Unknown error",
              createdAt: new Date()
            });
          } catch (logErr) {
            console.error(`Failed to log error for`, contact, `:`, logErr);
          }
          throw error;
        }
      })
    );

    const success = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    // 🔥 Save master summary log in Firestore
    try {
      await db.collection("promotions").add({
        campaignId: campaignId || "unknown",
        total: contacts.length,
        success,
        failed,
        message,
        createdAt: new Date()
      });
      console.log('API: Master log saved to Firestore successfully.');
    } catch (dbErr) {
      console.error("Failed to save master log to Firestore:", dbErr);
    }

    return NextResponse.json({
      total: contacts.length,
      success,
      failed
    });

  } catch (err: any) {
    console.error("Promotion API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
