import * as admin from 'firebase-admin';

export let initError: string | null = null;

// Check if admin has already been initialized
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
    const privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;

    // Try to initialize with environment variables first (Vercel/Production standard)
    if (projectId && privateKeyEnv && clientEmail) {
      let privateKey = privateKeyEnv;
      
      // Strip quotes if present
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.slice(1, -1);
      }
      
      // Replace escaped newlines
      privateKey = privateKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey,
        }),
      });
    } else {
      // Fallback: Try to use the local serviceAccountKey.json if it exists
      const fs = require('fs');
      const path = require('path');
      const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        initError = "No serviceAccountKey.json found and environment variables are missing.";
        console.warn("⚠️", initError);
      }
    }
  } catch (error: any) {
    initError = `Initialization failed: ${error.message}`;
    console.warn("⚠️ Firebase Admin initialization failed:", error.message);
    console.warn("API routes performing writes will fail.");
  }
}

// Export the admin db instance
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth() : null;

