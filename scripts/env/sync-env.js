// scripts/sync-env.js
const fs = require('fs');
const path = require('path');

const addressesPath = path.join(__dirname, '..', '..', 'contracts', 'deployed-addresses.json');
const frontendEnvPath = path.join(__dirname, '..', '..', 'frontend', '.env.local');
const backendEnvPath = path.join(__dirname, '..', '..', 'backend', '.env');

if (!fs.existsSync(addressesPath)) {
  console.error('❌ deployed-addresses.json not found. Run deployment first.');
  process.exit(1);
}

const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));

function updateEnv(filePath, mapping) {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  
  for (const [envVar, address] of Object.entries(mapping)) {
    const regex = new RegExp(`^${envVar}=.*`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${envVar}=${address}`);
    } else {
      content += `\n${envVar}=${address}`;
    }
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${path.basename(filePath)}`);
}

console.log('🔄 Syncing contract addresses to environment files...');

// Sync Frontend
updateEnv(frontendEnvPath, {
  'NEXT_PUBLIC_DONATE_CONTRACT': addresses.NexusDonate,
  'NEXT_PUBLIC_ESCROW_CONTRACT': addresses.NexusEscrow,
  'NEXT_PUBLIC_REPUTATION_CONTRACT': addresses.NexusReputation
});

// Sync Backend
updateEnv(backendEnvPath, {
  'DONATE_CONTRACT_ADDRESS': addresses.NexusDonate,
  'ESCROW_CONTRACT_ADDRESS': addresses.NexusEscrow,
  'REPUTATION_CONTRACT_ADDRESS': addresses.NexusReputation
});

console.log('✨ Environment sync complete!');
