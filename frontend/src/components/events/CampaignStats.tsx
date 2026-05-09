'use client';
// src/components/CampaignStats.tsx
// Reads live on-chain donation data from the NexusDonate contract.
// No wallet connection required — uses a public read-only provider.

import { useState, useEffect } from 'react';
import { formatEther, JsonRpcProvider } from 'ethers';
import { getReadOnlyDonateContract, CONTRACT_ADDRESS } from '@/lib/web3/contract';

interface Donation {
  donor: string;
  amount: string; // in MATIC, formatted
  timestamp: number;
}

interface Props {
  campaignId: number;
}

export function CampaignStats({ campaignId }: Props) {
  const [totalRaised, setTotalRaised] = useState<string | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === 'undefined') {
        setError('Contract not deployed');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        // Guard: verify contract exists at the configured address
        const rpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';
        const provider = new JsonRpcProvider(rpc);
        const code = await provider.getCode(CONTRACT_ADDRESS);
        if (!code || code === '0x') {
          setError('Contract not found on-chain');
          setLoading(false);
          return;
        }

        const contract = await getReadOnlyDonateContract();

        // Destructure: firebaseEventId, metadataCID, organizer, totalRaised, active
        const [, , , raised, active] = await contract.getCampaign(campaignId);
        if (cancelled) return;

        if (!active && Number(raised) === 0) {
          setError('Campaign not found on-chain');
          setLoading(false);
          return;
        }

        setTotalRaised(formatEther(raised));

        const count = Number(await contract.getDonationCount(campaignId));
        const records: Donation[] = [];

        // Read last 10 donations max to avoid UI overload
        const start = Math.max(0, count - 10);
        for (let i = start; i < count; i++) {
          const [donor, amount, timestamp] = await contract.getDonation(campaignId, i);
          records.push({
            donor: donor as string,
            amount: formatEther(amount as bigint),
            timestamp: Number(timestamp),
          });
        }

        if (!cancelled) {
          setDonations(records.reverse()); // newest first
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError('Unable to load on-chain data');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [campaignId]);

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-outline-variant/20 flex items-center gap-2 text-xs text-on-surface-variant/60">
        <span className="animate-spin rounded-full h-3 w-3 border border-outline-variant border-t-primary" />
        Loading on-chain data...
      </div>
    );
  }

  if (error) return null; // fail silently — don't break the UI if contract isn't deployed

  return (
    <div className="mt-4 pt-4 border-t border-outline-variant/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">link</span>
          On-Chain Transparency
        </p>
        <a
          href={`https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-primary/60 hover:text-primary transition-colors flex items-center gap-0.5"
        >
          PolygonScan
          <span className="material-symbols-outlined text-[11px]">open_in_new</span>
        </a>
      </div>

      {/* Total raised */}
      <div
        className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
        style={{ background: 'rgba(59,107,74,0.07)', border: '1px solid rgba(59,107,74,0.12)' }}
      >
        <span className="text-xs text-on-surface-variant font-medium">Total raised on-chain</span>
        <span className="font-bold text-sm text-primary">
          {parseFloat(totalRaised!).toFixed(4)} ETH
        </span>
      </div>

      {/* Donation history */}
      {donations.length > 0 ? (
        <ul className="space-y-2">
          {donations.map((d, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: '#f6851b' }}
              />
              <span className="font-mono text-on-surface-variant truncate flex-1">
                {d.donor.slice(0, 6)}...{d.donor.slice(-4)}
              </span>
              <span className="font-bold text-on-surface flex-shrink-0">
                {parseFloat(d.amount).toFixed(4)} ETH
              </span>
              <span className="text-on-surface-variant/50 flex-shrink-0">
                {new Date(d.timestamp * 1000).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-on-surface-variant/50 text-center py-2">
          No on-chain donations yet — be the first!
        </p>
      )}
    </div>
  );
}
