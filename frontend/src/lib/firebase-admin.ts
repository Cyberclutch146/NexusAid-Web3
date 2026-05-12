import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

export let initError: string | null = null;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
const privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY || process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const googleCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const localServiceAccountPaths = [
  path.join(process.cwd(), 'serviceAccountKey.json'),
  path.join(process.cwd(), 'frontend', 'serviceAccountKey.json'),
  path.join(process.cwd(), '..', 'frontend', 'serviceAccountKey.json'),
];

function loadServiceAccountFromFile(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findLocalServiceAccountPath() {
  return localServiceAccountPaths.find((candidate) => candidate && fs.existsSync(candidate));
}

// Check if admin has already been initialized
if (!admin.apps.length) {
  try {
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`,
      });
    } else if (googleCredentialsPath) {
      if (!fs.existsSync(googleCredentialsPath)) {
        throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file not found at ${googleCredentialsPath}`);
      }
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId || 'unknown-project'}.firebasestorage.app`,
      });
    } else if (projectId && clientEmail && privateKeyEnv) {
      let privateKey = privateKeyEnv;

      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
      });
    } else {
      const localPath = findLocalServiceAccountPath();
      if (localPath) {
        const serviceAccount = loadServiceAccountFromFile(localPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`,
        });
      } else {
        initError = 'No Firebase Admin credentials found. Add serviceAccountKey.json or set FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_PRIVATE_KEY.';
        console.warn('⚠️', initError);
      }
    }
  } catch (error: any) {
    initError = `Initialization failed: ${error.message}`;
    console.warn('⚠️ Firebase Admin initialization failed:', error.message);
    console.warn('API routes performing writes will fail.');
  }
}

export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminStorage = admin.apps.length ? admin.storage() : null;

