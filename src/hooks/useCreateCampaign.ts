'use client';
// src/hooks/useCreateCampaign.ts
// After a Firebase event is created, this hook calls createCampaign() on the
// NexusDonate contract and writes the returned on-chain campaignId back to Firestore.

import { useState, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
import { getContract } from '@/lib/contract';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type CampaignCreationStatus = 'idle' | 'waiting' | 'pending' | 'success' | 'error' | 'skipped';

export function useCreateCampaign() {
  const [status, setStatus] = useState<CampaignCreationStatus>('idle');
  const [onChainId, setOnChainId] = useState<number | null>(null);

  /**
   * Prompts MetaMask to create an on-chain campaign linked to the Firebase event,
   * then writes the campaignId back to the Firestore document.
   */
  const createOnChainCampaign = useCallback(async (firebaseEventId: string) => {
    if (!window.ethereum) {
      // No wallet — skip silently, the event is still usable without Web3
      setStatus('skipped');
      return null;
    }

    try {
      setStatus('waiting'); // waiting for user to approve in MetaMask
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);

      setStatus('pending'); // tx submitted
      const tx = await contract.createCampaign(firebaseEventId);
      const receipt = await tx.wait();

      // Parse the CampaignCreated event to get the on-chain campaign ID
      const event = receipt?.logs
        ?.map((log: any) => {
          try { return contract.interface.parseLog(log); } catch { return null; }
        })
        .find((e: any) => e?.name === 'CampaignCreated');

      const campaignId = event ? Number(event.args.id) : 0;

      // Write campaignId back to Firestore
      await updateDoc(doc(db, 'events', firebaseEventId), {
        onChainCampaignId: campaignId,
        contractAddress: process.env.NEXT_PUBLIC_DONATE_CONTRACT,
      });

      setOnChainId(campaignId);
      setStatus('success');
      return campaignId;
    } catch (err: any) {
      // User rejected MetaMask — don't block the event creation flow
      if (err?.code === 'ACTION_REJECTED' || err?.code === 4001) {
        setStatus('skipped');
        return null;
      }
      console.error('Failed to create on-chain campaign:', err);
      setStatus('error');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setOnChainId(null);
  }, []);

  return { createOnChainCampaign, status, onChainId, reset };
}
