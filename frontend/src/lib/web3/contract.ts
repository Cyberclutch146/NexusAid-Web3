// src/lib/contract.ts
import { Contract, JsonRpcSigner, BrowserProvider, JsonRpcProvider, parseEther, formatEther } from 'ethers';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DONATE_CONTRACT!;
const AMOY_RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';

// Human-readable ABI — ethers v6 parses this natively
const ABI = [
  "function createCampaign(string _firebaseEventId) external returns (uint256)",
  "function donate(uint256 _campaignId) external payable",
  "function withdraw(uint256 _campaignId) external",
  "function getCampaign(uint256 _campaignId) view returns (string firebaseEventId, address organizer, uint256 totalRaised, bool active)",
  "function getDonationCount(uint256 _campaignId) view returns (uint256)",
  "function getDonation(uint256 _campaignId, uint256 _index) view returns (address donor, uint256 amount, uint256 timestamp)",
  "function campaignCount() view returns (uint256)",
  "event CampaignCreated(uint256 indexed id, string firebaseEventId, address organizer)",
  "event DonationMade(uint256 indexed campaignId, address indexed donor, uint256 amount)",
  "event FundsWithdrawn(uint256 indexed campaignId, uint256 amount)",
];

/** Get a contract instance connected to a signer (for write ops) */
export function getContract(signer: JsonRpcSigner) {
  return new Contract(CONTRACT_ADDRESS, ABI, signer);
}

/** Get a read-only contract instance (no wallet needed) */
export function getReadOnlyContract(provider: BrowserProvider) {
  return new Contract(CONTRACT_ADDRESS, ABI, provider);
}

/** Get a self-contained read-only contract (uses configured RPC, no wallet needed) */
export async function getReadOnlyDonateContract() {
  const provider = new JsonRpcProvider(AMOY_RPC);
  return new Contract(CONTRACT_ADDRESS, ABI, provider);
}

export { parseEther, formatEther, CONTRACT_ADDRESS };
