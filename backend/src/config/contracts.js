'use strict';

require('dotenv').config();
const { JsonRpcProvider, Contract } = require('ethers');

// ─── RPC Provider ────────────────────────────────────────────────────────────
const provider = new JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');

// ─── Contract Addresses ──────────────────────────────────────────────────────
const DONATE_ADDRESS      = process.env.DONATE_CONTRACT_ADDRESS;
const ESCROW_ADDRESS      = process.env.ESCROW_CONTRACT_ADDRESS;
const REPUTATION_ADDRESS  = process.env.REPUTATION_CONTRACT_ADDRESS;

if (!DONATE_ADDRESS || !ESCROW_ADDRESS || !REPUTATION_ADDRESS) {
  console.error('❌ Missing contract address env vars. Check your .env file.');
  process.exit(1);
}

// ─── NexusDonate ABI (event signatures only) ─────────────────────────────────
const DONATE_ABI = [
  'event CampaignCreated(uint256 indexed id, string firebaseEventId, address organizer, string metadataCID)',
  'event DonationMade(uint256 indexed campaignId, address indexed donor, uint256 amount)',
  'event FundsWithdrawn(uint256 indexed campaignId, uint256 amount)',
  'event MetadataUpdated(uint256 indexed campaignId, string newMetadataCID)',
  // Read helpers needed by listeners
  'function getCampaign(uint256 _campaignId) view returns (string firebaseEventId, string metadataCID, address organizer, uint256 totalRaised, bool active)',
];

// ─── NexusEscrow ABI (event signatures only) ─────────────────────────────────
const ESCROW_ABI = [
  'event CampaignCreated(uint256 indexed id, string firebaseEventId, address organizer, uint8 milestoneCount)',
  'event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount)',
  'event MilestoneProposed(uint256 indexed campaignId, uint8 milestoneIndex)',
  'event MilestoneApproved(uint256 indexed campaignId, uint8 milestoneIndex, uint256 released)',
  'event FundsReleased(uint256 indexed campaignId, address organizer, uint256 amount)',
  'event CampaignAbandoned(uint256 indexed campaignId)',
  'event RefundIssued(uint256 indexed campaignId, address donor, uint256 amount)',
];

// ─── NexusReputation ABI (event signatures only) ─────────────────────────────
const REPUTATION_ABI = [
  'event BadgeMinted(address indexed recipient, uint256 indexed tokenId, string badgeType, uint256 timestamp)',
];

// ─── Contract Instances ───────────────────────────────────────────────────────
const donateContract     = new Contract(DONATE_ADDRESS,     DONATE_ABI,     provider);
const escrowContract     = new Contract(ESCROW_ADDRESS,     ESCROW_ABI,     provider);
const reputationContract = new Contract(REPUTATION_ADDRESS, REPUTATION_ABI, provider);

module.exports = {
  provider,
  donateContract,
  escrowContract,
  reputationContract,
  DONATE_ADDRESS,
  ESCROW_ADDRESS,
  REPUTATION_ADDRESS,
};
