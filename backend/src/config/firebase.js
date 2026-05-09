'use strict';

require('dotenv').config();
const admin = require('firebase-admin');

// ─── Firebase Admin Initialization ───────────────────────────────────────────
// Supports two modes:
//   1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON file
//   2. Inline service account JSON encoded in FIREBASE_SERVICE_ACCOUNT env var
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
    process.exit(1);
  }
}

if (!admin.apps.length) {
  const initOptions = {
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  };

  if (serviceAccount) {
    initOptions.credential = admin.credential.cert(serviceAccount);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Let the SDK pick up the file path automatically
    initOptions.credential = admin.credential.applicationDefault();
  } else {
    console.error(
      '❌ No Firebase credentials found.\n' +
      '   Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS in your .env file.'
    );
    process.exit(1);
  }

  admin.initializeApp(initOptions);
  console.log('✅ Firebase Admin initialized');
}

const db = admin.firestore();

module.exports = { admin, db };
