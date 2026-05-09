/**
 * pinata.ts
 * Client-side helper for uploading files and JSON metadata to IPFS via Pinata.
 *
 * All uploads go through the server-side API route (/api/ipfs/upload) so that
 * Pinata API keys are never exposed in browser code.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CampaignMetadata {
  name: string;
  description: string;
  organizer: string;
  goal: string;
  milestones: string[];
  category?: string;
  location?: string;
  firebaseEventId?: string;
  createdAt: string;
  image?: string; // IPFS CID of the cover image
}

export interface IPFSUploadResult {
  cid: string;
  url: string;
}

// ─── Public IPFS Gateways ─────────────────────────────────────────────────────
const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud';

/**
 * Convert a raw IPFS CID into a publicly accessible HTTPS URL.
 * Falls back to the Pinata public gateway if no custom gateway is configured.
 */
export function ipfsToHTTP(cid: string): string {
  if (!cid) return '';
  // Strip ipfs:// prefix if present
  const cleanCid = cid.startsWith('ipfs://') ? cid.slice(7) : cid;
  return `${GATEWAY}/ipfs/${cleanCid}`;
}

/**
 * Get multiple gateway fallback URLs for a CID.
 * Useful for building <img> fallback chains.
 */
export function ipfsGatewayFallbacks(cid: string): string[] {
  const cleanCid = cid.startsWith('ipfs://') ? cid.slice(7) : cid;
  return [
    `${GATEWAY}/ipfs/${cleanCid}`,
    `https://cloudflare-ipfs.com/ipfs/${cleanCid}`,
    `https://ipfs.io/ipfs/${cleanCid}`,
  ];
}

// ─── File Upload ─────────────────────────────────────────────────────────────

/**
 * Upload a file (image, PDF, etc.) to IPFS via the server-side Pinata proxy.
 * Returns the CID and a public HTTPS gateway URL.
 */
export async function uploadFileToIPFS(
  file: File,
  name?: string
): Promise<IPFSUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const res = await fetch('/api/ipfs/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `IPFS upload failed: ${res.status}`);
  }

  const { cid } = await res.json() as { cid: string };
  return { cid, url: ipfsToHTTP(cid) };
}

// ─── JSON Metadata Upload ─────────────────────────────────────────────────────

/**
 * Upload a JSON metadata object to IPFS via the server-side Pinata proxy.
 * Used for campaign metadata and milestone evidence records.
 */
export async function uploadJSONToIPFS(
  metadata: Record<string, unknown>,
  name?: string
): Promise<IPFSUploadResult> {
  const res = await fetch('/api/ipfs/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: metadata, name }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `IPFS JSON upload failed: ${res.status}`);
  }

  const { cid } = await res.json() as { cid: string };
  return { cid, url: ipfsToHTTP(cid) };
}

// ─── Campaign Metadata Builder ────────────────────────────────────────────────

/**
 * Build and upload a complete campaign metadata JSON to IPFS.
 * This CID is what gets stored on-chain in NexusDonate.createCampaign().
 *
 * @param meta - Campaign details
 * @param coverFile - Optional cover image file to upload first
 * @returns CID of the metadata JSON
 */
export async function uploadCampaignMetadata(
  meta: Omit<CampaignMetadata, 'image' | 'createdAt'>,
  coverFile?: File
): Promise<IPFSUploadResult> {
  let imageCid: string | undefined;

  // Upload cover image first if provided
  if (coverFile) {
    const imageResult = await uploadFileToIPFS(
      coverFile,
      `nexusaid-campaign-cover-${Date.now()}`
    );
    imageCid = imageResult.cid;
  }

  const metadataJson: CampaignMetadata = {
    ...meta,
    image: imageCid,
    createdAt: new Date().toISOString(),
  };

  return uploadJSONToIPFS(
    metadataJson as unknown as Record<string, unknown>,
    `nexusaid-campaign-${meta.firebaseEventId || Date.now()}`
  );
}

// ─── Milestone Evidence Builder ───────────────────────────────────────────────

export interface MilestoneEvidence {
  campaignId: string;
  milestoneIndex: number;
  description: string;
  evidenceFiles: string[]; // CIDs of uploaded evidence files
  proposedBy: string;
  proposedAt: string;
}

/**
 * Upload milestone completion evidence to IPFS.
 * The returned CID is stored on-chain in proposeMilestoneComplete().
 */
export async function uploadMilestoneEvidence(
  evidence: Omit<MilestoneEvidence, 'evidenceFiles' | 'proposedAt'>,
  files: File[]
): Promise<IPFSUploadResult> {
  // Upload all evidence files in parallel
  const fileUploadPromises = files.map((f) =>
    uploadFileToIPFS(f, `nexusaid-evidence-${evidence.campaignId}-${evidence.milestoneIndex}`)
  );
  const fileResults = await Promise.all(fileUploadPromises);
  const evidenceCids = fileResults.map((r) => r.cid);

  const evidenceJson: MilestoneEvidence = {
    ...evidence,
    evidenceFiles: evidenceCids,
    proposedAt: new Date().toISOString(),
  };

  return uploadJSONToIPFS(
    evidenceJson as unknown as Record<string, unknown>,
    `nexusaid-milestone-${evidence.campaignId}-${evidence.milestoneIndex}`
  );
}
