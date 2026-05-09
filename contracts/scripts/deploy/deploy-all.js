/**
 * deploy-all.js
 * Deploys NexusDonate, NexusEscrow, and NexusReputation to the target network
 * in sequence, then prints a ready-to-paste .env block with all addresses.
 *
 * Usage (from contracts/ dir):
 *   npx hardhat run scripts/deploy/deploy-all.js --network localhost
 *   npx hardhat run scripts/deploy/deploy-all.js --network amoy
 */

const hre = require('hardhat');
const fs  = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network    = hre.network.name;

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║      NexusAid — Full Contract Deployment Suite      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`Network  : ${network}`);
  console.log(`Deployer : ${deployer.address}`);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance  : ${hre.ethers.formatEther(balance)} ETH\n`);

  // ── 1. NexusDonate ──────────────────────────────────────────────────────────
  console.log('▶  [1/3] Deploying NexusDonate...');
  const NexusDonate = await hre.ethers.getContractFactory('NexusDonate');
  const donate      = await NexusDonate.deploy();
  await donate.waitForDeployment();
  const donateAddress = donate.target;
  console.log(`   ✅ NexusDonate   → ${donateAddress}`);

  // ── 2. NexusEscrow ──────────────────────────────────────────────────────────
  console.log('▶  [2/3] Deploying NexusEscrow...');
  const NexusEscrow = await hre.ethers.getContractFactory('NexusEscrow');
  const escrow      = await NexusEscrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = escrow.target;
  console.log(`   ✅ NexusEscrow   → ${escrowAddress}`);

  // ── 3. NexusReputation ──────────────────────────────────────────────────────
  console.log('▶  [3/3] Deploying NexusReputation...');
  const NexusReputation = await hre.ethers.getContractFactory('NexusReputation');
  const reputation      = await NexusReputation.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = reputation.target;
  console.log(`   ✅ NexusReputation → ${reputationAddress}`);

  // ── Seed demo data on local network ─────────────────────────────────────────
  if (network === 'localhost' || network === 'hardhat') {
    console.log('\n▶  Seeding demo data on local node...');

    // Create a demo campaign (NexusDonate) — two args: firebaseId + metadataCID
    const tx1 = await donate.createCampaign('demo-event-001', '');
    await tx1.wait();
    console.log('   📋 Demo campaign #0 created in NexusDonate');

    // Create a demo escrow campaign — firebaseId + milestones
    const tx2 = await escrow.createCampaign('demo-event-001', [
      'Phase 1: Emergency relief supplies',
      'Phase 2: Shelter construction',
    ]);
    await tx2.wait();
    console.log('   🔐 Demo escrow campaign #0 created with 2 milestones');
  }

  // ── Print env block ──────────────────────────────────────────────────────────
  const envBlock = [
    '',
    '═══════════════════════════════════════════════════════════════',
    '  COPY THESE INTO frontend/.env.local  AND  backend/.env',
    '═══════════════════════════════════════════════════════════════',
    '',
    '# ─── Smart Contract Addresses ──────────────────────────────',
    `NEXT_PUBLIC_DONATE_CONTRACT=${donateAddress}`,
    `NEXT_PUBLIC_ESCROW_CONTRACT=${escrowAddress}`,
    `NEXT_PUBLIC_REPUTATION_CONTRACT=${reputationAddress}`,
    '',
    '# ─── Backend .env ───────────────────────────────────────────',
    `DONATE_CONTRACT_ADDRESS=${donateAddress}`,
    `ESCROW_CONTRACT_ADDRESS=${escrowAddress}`,
    `REPUTATION_CONTRACT_ADDRESS=${reputationAddress}`,
    network === 'localhost' || network === 'hardhat'
      ? 'RPC_URL=http://127.0.0.1:8545'
      : 'RPC_URL=https://rpc-amoy.polygon.technology',
    '',
    network !== 'localhost' && network !== 'hardhat'
      ? `View on PolygonScan: https://amoy.polygonscan.com/address/${donateAddress}`
      : '',
  ].join('\n');

  console.log(envBlock);

  // ── Auto-write deployed-addresses.json for tooling ──────────────────────────
  const addressesPath = path.join(__dirname, '..', '..', 'deployed-addresses.json');
  const addresses = {
    network,
    deployedAt: new Date().toISOString(),
    NexusDonate:     donateAddress,
    NexusEscrow:     escrowAddress,
    NexusReputation: reputationAddress,
  };
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log(`\n📄 Addresses saved to contracts/deployed-addresses.json`);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err);
  process.exitCode = 1;
});
