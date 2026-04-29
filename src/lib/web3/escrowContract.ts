// src/lib/escrowContract.ts
import { Contract, JsonRpcSigner, BrowserProvider, JsonRpcProvider } from 'ethers';

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT!;
const AMOY_RPC = 'https://rpc-amoy.polygon.technology';

// Human-readable ABI for NexusEscrow
const ESCROW_ABI = [
  // Write
  "function createCampaign(string _firebaseEventId, string[] _milestoneDescs) external returns (uint256)",
  "function donate(uint256 _campaignId) external payable",
  "function proposeMilestoneComplete(uint256 _campaignId, uint8 _milestoneIndex) external",
  "function approveMilestone(uint256 _campaignId, uint8 _milestoneIndex) external",
  "function abandonCampaign(uint256 _campaignId) external",
  "function claimRefund(uint256 _campaignId) external",

  // Read
  "function getCampaign(uint256 _id) view returns (string firebaseEventId, address organizer, uint256 totalRaised, uint256 totalReleased, uint8 milestoneCount, uint8 status)",
  "function getMilestone(uint256 _campaignId, uint8 _index) view returns (string description, uint8 status, uint256 releasedAmount)",
  "function getDonorAmount(uint256 _campaignId, address _donor) view returns (uint256)",
  "function campaignCount() view returns (uint256)",
  "function owner() view returns (address)",

  // Events
  "event CampaignCreated(uint256 indexed id, string firebaseEventId, address organizer, uint8 milestoneCount)",
  "event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount)",
  "event MilestoneProposed(uint256 indexed campaignId, uint8 milestoneIndex)",
  "event MilestoneApproved(uint256 indexed campaignId, uint8 milestoneIndex, uint256 released)",
  "event FundsReleased(uint256 indexed campaignId, address organizer, uint256 amount)",
  "event CampaignAbandoned(uint256 indexed campaignId)",
  "event RefundIssued(uint256 indexed campaignId, address donor, uint256 amount)",
];

export function getEscrowContract(signer: JsonRpcSigner) {
  return new Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
}

export async function getReadOnlyEscrowContract() {
  const provider =
    typeof window !== 'undefined' && window.ethereum
      ? new BrowserProvider(window.ethereum)
      : new JsonRpcProvider(AMOY_RPC);
  return new Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);
}

export { ESCROW_ADDRESS, ESCROW_ABI };
