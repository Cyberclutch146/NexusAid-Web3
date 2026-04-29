const admin = require("firebase-admin");

let db;

try {
  const fs = require('fs');
  const path = require('path');
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    db = admin.firestore();
  } else {
    throw new Error("serviceAccountKey.json not found at " + serviceAccountPath);
  }
} catch (error) {
  console.warn("⚠️ Firebase Admin initialization failed! Please update serviceAccountKey.json with valid credentials.");
  console.warn(error.message);
  
  // Create a dummy db object so the API doesn't crash when calling db.collection.add
  db = {
    collection: () => ({
      add: async () => console.log("[Dummy DB] Would have saved to Firestore")
    })
  };
}

module.exports = db;
