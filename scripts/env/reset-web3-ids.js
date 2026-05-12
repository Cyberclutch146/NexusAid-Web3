// scripts/reset-web3-ids.js
const path = require('path');
// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'backend', '.env') });

// Fix relative path for GOOGLE_APPLICATION_CREDENTIALS if it exists
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('..')) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '..', '..', 'frontend', 'serviceAccountKey.json');
}

const { admin, db } = require('../../backend/src/config/firebase');

async function resetIds() {
  console.log('🔄 Resetting On-Chain IDs in Firestore...');
  
  const eventsRef = db.collection('events');
  const snapshot = await eventsRef.get();

  if (snapshot.empty) {
    console.log('ℹ️ No events found.');
  } else {
    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.onChainCampaignId !== undefined || data.blockchainCampaignId !== undefined) {
        batch.update(doc.ref, {
          onChainCampaignId: admin.firestore.FieldValue.delete(),
          blockchainCampaignId: admin.firestore.FieldValue.delete(),
          contractAddress: admin.firestore.FieldValue.delete()
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ Successfully cleared Web3 IDs from ${count} events.`);
    } else {
      console.log('ℹ️ No stale Web3 IDs to clear.');
    }
  }

  console.log(`
   ██████╗██╗   ██╗ ██████╗ ██████╗███████╗███████╗███████╗
  ██╔════╝██║   ██║██╔════╝██╔════╝██╔════╝██╔════╝██╔════╝
  ╚█████╗ ██║   ██║██║     ██║     █████╗  ███████╗███████╗
   ╚═══██╗██║   ██║██║     ██║     ██╔══╝  ╚════██║╚════██║
  ██████╔╝╚██████╔╝╚██████╗╚██████╗███████╗███████║███████║
  ╚═════╝  ╚═════╝  ╚═════╝ ╚═════╝╚══════╝╚══════╝╚══════╝
                                                           
  NexusAid Sync Complete — Ready to Build!
  `);
}

resetIds().catch(err => {
  console.error('❌ Error during ID reset:', err.message);
  process.exit(1);
});
