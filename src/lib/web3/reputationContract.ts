// src/lib/reputationContract.ts
import { Contract, JsonRpcSigner, BrowserProvider, JsonRpcProvider } from 'ethers';

const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_CONTRACT!;
const AMOY_RPC = 'https://rpc-amoy.polygon.technology';

// Human-readable ABI for NexusReputation
const REPUTATION_ABI = [
  // Write (owner-only on-chain; called via server-side API)
  "function mintBadge(address _recipient, string _badgeType, string _metadataURI) external returns (uint256)",

  // Read
  "function getBadgesByOwner(address _wallet) view returns (uint256[])",
  "function getBadgeInfo(uint256 _tokenId) view returns (string badgeType, address recipient, uint256 mintedAt)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalMinted() view returns (uint256)",
  "function owner() view returns (address)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",

  // Events
  "event BadgeMinted(address indexed recipient, uint256 indexed tokenId, string badgeType, uint256 timestamp)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

export function getReputationContract(signer: JsonRpcSigner) {
  return new Contract(REPUTATION_ADDRESS, REPUTATION_ABI, signer);
}

export async function getReadOnlyReputationContract() {
  const provider =
    typeof window !== 'undefined' && window.ethereum
      ? new BrowserProvider(window.ethereum)
      : new JsonRpcProvider(AMOY_RPC);
  return new Contract(REPUTATION_ADDRESS, REPUTATION_ABI, provider);
}

// ─── Badge Tier Config ────────────────────────────────────────────────────────
export interface BadgeTierConfig {
  type: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  emoji: string;
  description: string;
}

export const BADGE_TIERS: Record<string, BadgeTierConfig> = {
  bronze: {
    type: 'bronze',
    label: 'Bronze',
    color: '#cd7f32',
    bg: 'rgba(205,127,50,0.1)',
    border: 'rgba(205,127,50,0.25)',
    emoji: '🥉',
    description: 'First steps in community impact',
  },
  silver: {
    type: 'silver',
    label: 'Silver',
    color: '#aaa9ad',
    bg: 'rgba(170,169,173,0.1)',
    border: 'rgba(170,169,173,0.25)',
    emoji: '🥈',
    description: 'Growing contributor to disaster relief',
  },
  gold: {
    type: 'gold',
    label: 'Gold',
    color: '#d4a800',
    bg: 'rgba(212,168,0,0.1)',
    border: 'rgba(212,168,0,0.25)',
    emoji: '🥇',
    description: 'Established relief champion',
  },
  platinum: {
    type: 'platinum',
    label: 'Platinum',
    color: '#6db3b8',
    bg: 'rgba(109,179,184,0.1)',
    border: 'rgba(109,179,184,0.25)',
    emoji: '💠',
    description: 'Dedicated pillar of the NexusAid community',
  },
  master: {
    type: 'master',
    label: 'Master',
    color: '#9b59b6',
    bg: 'rgba(155,89,182,0.1)',
    border: 'rgba(155,89,182,0.25)',
    emoji: '⚡',
    description: 'Elite-tier disaster relief expert',
  },
  diamond: {
    type: 'diamond',
    label: 'Diamond',
    color: '#00d4ff',
    bg: 'rgba(0,212,255,0.1)',
    border: 'rgba(0,212,255,0.25)',
    emoji: '💎',
    description: 'Exceptional — awarded by NexusAid for extraordinary contributions',
  },
  // Supplementary badge types
  first_donation: {
    type: 'first_donation',
    label: 'First Donor',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.25)',
    emoji: '💚',
    description: 'Made their first on-chain donation',
  },
  organizer: {
    type: 'organizer',
    label: 'Organizer',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.25)',
    emoji: '🏅',
    description: 'Successfully organized a NexusAid campaign',
  },
};

export { REPUTATION_ADDRESS, REPUTATION_ABI };
