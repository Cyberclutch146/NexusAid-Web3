'use client';
// src/components/MilestoneTracker.tsx
// Visual milestone progress tracker for NexusEscrow campaigns.
// Shows milestone steps with status indicators and fund release info.

import { useState, useEffect } from 'react';
import { formatEther } from 'ethers';
import { useWallet } from '@/hooks/useWallet';
import { getReadOnlyEscrowContract } from '@/lib/web3/escrowContract';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface Milestone {
  description: string;
  evidenceCID?: string;
  status: number; // 0=Pending, 1=Proposed, 2=Approved
  releasedAmount: string; // ETH string
}

interface MilestoneTrackerProps {
  escrowCampaignId: number;
  milestoneDescriptions?: string[];
  organizerId?: string;
  isAdmin?: boolean;
}

const STATUS_LABELS = ['Pending', 'Proposed', 'Approved'];
const STATUS_COLORS = [
  { bg: 'rgba(100,100,100,0.1)', border: 'rgba(100,100,100,0.2)', text: '#888', dot: '#888' },
  { bg: 'rgba(212,168,0,0.1)',   border: 'rgba(212,168,0,0.25)',  text: '#d4a800', dot: '#d4a800' },
  { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)',   text: '#16a34a', dot: '#22c55e' },
];

export function MilestoneTracker({
  escrowCampaignId,
  organizerId,
  isAdmin = false,
}: MilestoneTrackerProps) {
  const { user } = useAuth();
  const { signer } = useWallet();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [totalRaised, setTotalRaised] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const isOrganizer = user?.uid === organizerId;

  const load = async () => {
    try {
      const contract = await getReadOnlyEscrowContract();

      // Guard: verify contract exists at the configured address
      const escrowAddr = process.env.NEXT_PUBLIC_ESCROW_CONTRACT;
      if (!escrowAddr || escrowAddr === 'undefined') {
        setLoading(false);
        return;
      }
      const { JsonRpcProvider } = await import('ethers');
      const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology');
      const code = await provider.getCode(escrowAddr);
      if (!code || code === '0x') {
        console.warn('Escrow contract not found at configured address.');
        setLoading(false);
        return;
      }

      const [, , raised, , milestoneCount] = await contract.getCampaign(escrowCampaignId);
      setTotalRaised(formatEther(raised as bigint));

      const count = Number(milestoneCount);
      const results: Milestone[] = [];
      for (let i = 0; i < count; i++) {
        // ABI: description, evidenceCID, status, releasedAmount
        const [description, evidenceCID, status, releasedAmount] = await contract.getMilestone(escrowCampaignId, i);
        results.push({
          description: description as string,
          evidenceCID: evidenceCID as string,
          status: Number(status),
          releasedAmount: formatEther(releasedAmount as bigint),
        });
      }
      setMilestones(results);
    } catch (err) {
      console.error('MilestoneTracker load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escrowCampaignId]);

  const handlePropose = async (index: number) => {
    if (!user) return;
    setActionLoading(index);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/web3/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action: 'propose', campaignId: escrowCampaignId, milestoneIndex: index }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Milestone ${index + 1} proposed! Awaiting admin approval.`);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to propose milestone');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (index: number) => {
    if (!user) return;
    setActionLoading(index);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/web3/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action: 'approve', campaignId: escrowCampaignId, milestoneIndex: index }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Milestone ${index + 1} approved! Funds released to organizer.`);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve milestone');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-on-surface-variant/60 py-3">
        <span className="animate-spin rounded-full h-3 w-3 border border-outline-variant border-t-primary" />
        Loading escrow milestones...
      </div>
    );
  }

  if (milestones.length === 0) return null;

  const approvedCount = milestones.filter(m => m.status === 2).length;
  const progress = (approvedCount / milestones.length) * 100;
  const perMilestoneAmount = milestones.length > 0
    ? (parseFloat(totalRaised) / milestones.length).toFixed(4)
    : '0';

  return (
    <div
      className="rounded-[20px] p-5 mt-4"
      style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: 'rgba(59,107,74,0.1)' }}
          >
            <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--color-primary-base)' }}>
              account_balance
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-on-surface">Milestone Escrow</p>
            <p className="text-xs text-on-surface-variant">
              {approvedCount}/{milestones.length} milestones • {parseFloat(totalRaised).toFixed(4)} MATIC locked
            </p>
          </div>
        </div>
        <a
          href={`https://amoy.polygonscan.com/address/${process.env.NEXT_PUBLIC_ESCROW_CONTRACT}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-primary/60 hover:text-primary transition-colors flex items-center gap-0.5"
        >
          PolygonScan
          <span className="material-symbols-outlined text-[11px]">open_in_new</span>
        </a>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: 'rgba(100,100,100,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--color-primary-base), var(--color-moss))',
          }}
        />
      </div>

      {/* Milestone steps */}
      <div className="space-y-3">
        {milestones.map((m, i) => {
          const colors = STATUS_COLORS[m.status] || STATUS_COLORS[0];
          const isLast = i === milestones.length - 1;

          return (
            <div key={i} className="flex gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300"
                  style={{
                    background: m.status === 2
                      ? 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))'
                      : colors.bg,
                    border: `1.5px solid ${colors.border}`,
                    color: m.status === 2 ? '#fff' : colors.text,
                  }}
                >
                  {m.status === 2 ? (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  ) : (
                    i + 1
                  )}
                </div>
                {!isLast && (
                  <div
                    className="w-px flex-1 mt-1"
                    style={{ background: m.status === 2 ? 'var(--color-primary-base)' : 'rgba(100,100,100,0.15)', minHeight: '12px' }}
                  />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-on-surface leading-tight">{m.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                      >
                        {STATUS_LABELS[m.status]}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        ~{perMilestoneAmount} MATIC on approval
                      </span>
                      {m.status === 2 && parseFloat(m.releasedAmount) > 0 && (
                        <span className="text-[10px] font-bold" style={{ color: 'var(--color-primary-base)' }}>
                          ✓ {parseFloat(m.releasedAmount).toFixed(4)} MATIC released
                        </span>
                      )}
                    </div>
                    {m.evidenceCID && (
                      <div className="mt-3 relative w-full max-w-[200px] h-28 rounded-lg overflow-hidden border border-white/10 group">
                        <img 
                          src={`https://gateway.pinata.cloud/ipfs/${m.evidenceCID}`} 
                          alt="Milestone Evidence"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <a 
                          href={`https://gateway.pinata.cloud/ipfs/${m.evidenceCID}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          View Proof
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {m.status === 0 && isOrganizer && (
                    <button
                      onClick={() => handlePropose(i)}
                      disabled={actionLoading === i}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                      style={{
                        background: 'rgba(212,168,0,0.1)',
                        color: '#d4a800',
                        border: '1px solid rgba(212,168,0,0.25)',
                      }}
                    >
                      {actionLoading === i ? '...' : 'Propose Done'}
                    </button>
                  )}

                  {m.status === 1 && isAdmin && (
                    <button
                      onClick={() => handleApprove(i)}
                      disabled={actionLoading === i}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                      style={{
                        background: 'rgba(34,197,94,0.1)',
                        color: '#16a34a',
                        border: '1px solid rgba(34,197,94,0.25)',
                      }}
                    >
                      {actionLoading === i ? '...' : 'Approve & Release'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Donor protection notice */}
      <div
        className="mt-4 px-3 py-2 rounded-xl text-xs text-on-surface-variant flex items-start gap-2"
        style={{ background: 'rgba(59,107,74,0.05)', border: '1px solid rgba(59,107,74,0.1)' }}
      >
        <span className="material-symbols-outlined text-[14px] flex-shrink-0 mt-0.5" style={{ color: 'var(--color-primary-base)' }}>
          shield
        </span>
        <span>
          Funds are locked in a smart contract and only released milestone by milestone. If the campaign is abandoned, donors can claim a proportional refund.
        </span>
      </div>
    </div>
  );
}
