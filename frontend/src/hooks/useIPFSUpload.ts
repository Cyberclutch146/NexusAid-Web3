/**
 * useIPFSUpload.ts
 * React hook for uploading files and campaign metadata to IPFS via Pinata.
 *
 * Usage:
 *   const { uploadFile, uploadCampaignMeta, isUploading, error } = useIPFSUpload();
 *
 *   const { cid, url } = await uploadFile(imageFile);
 *   const { cid: metaCid } = await uploadCampaignMeta(meta, coverFile);
 */

'use client';

import { useState, useCallback } from 'react';
import {
  uploadFileToIPFS,
  uploadCampaignMetadata,
  uploadMilestoneEvidence,
  type CampaignMetadata,
  type IPFSUploadResult,
} from '@/lib/ipfs/pinata';

interface UseIPFSUploadReturn {
  /** Upload a single file to IPFS */
  uploadFile: (file: File, name?: string) => Promise<IPFSUploadResult>;

  /** Build and upload a complete campaign metadata JSON (with optional cover image) */
  uploadCampaignMeta: (
    meta: Omit<CampaignMetadata, 'image' | 'createdAt'>,
    coverFile?: File
  ) => Promise<IPFSUploadResult>;

  /** Upload milestone evidence files + metadata JSON */
  uploadEvidence: (
    evidence: {
      campaignId: string;
      milestoneIndex: number;
      description: string;
      proposedBy: string;
    },
    files: File[]
  ) => Promise<IPFSUploadResult>;

  isUploading: boolean;
  progress: string;
  error: string | null;
  clearError: () => void;
}

export function useIPFSUpload(): UseIPFSUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress,    setProgress]    = useState('');
  const [error,       setError]       = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const uploadFile = useCallback(async (file: File, name?: string): Promise<IPFSUploadResult> => {
    setIsUploading(true);
    setError(null);
    setProgress('Uploading file to IPFS…');
    try {
      const result = await uploadFileToIPFS(file, name);
      setProgress('Upload complete');
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'IPFS upload failed';
      setError(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadCampaignMeta = useCallback(
    async (
      meta: Omit<CampaignMetadata, 'image' | 'createdAt'>,
      coverFile?: File
    ): Promise<IPFSUploadResult> => {
      setIsUploading(true);
      setError(null);

      try {
        if (coverFile) {
          setProgress('Uploading cover image to IPFS… (1/2)');
        } else {
          setProgress('Uploading campaign metadata to IPFS…');
        }

        const result = await uploadCampaignMetadata(meta, coverFile);
        setProgress('Metadata pinned to IPFS ✓');
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'IPFS metadata upload failed';
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const uploadEvidence = useCallback(
    async (
      evidence: {
        campaignId: string;
        milestoneIndex: number;
        description: string;
        proposedBy: string;
      },
      files: File[]
    ): Promise<IPFSUploadResult> => {
      setIsUploading(true);
      setError(null);
      setProgress(`Uploading ${files.length} evidence file(s) to IPFS…`);

      try {
        const result = await uploadMilestoneEvidence(evidence, files);
        setProgress('Evidence pinned to IPFS ✓');
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Evidence upload failed';
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return { uploadFile, uploadCampaignMeta, uploadEvidence, isUploading, progress, error, clearError };
}
