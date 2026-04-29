'use client';
// src/app/(app)/dashboard/blockchain/page.tsx
// NexusAid Blockchain Identity Hub
// Displays wallet linkage, SBT badges, on-chain stats, and escrow activity.

import { useState, useEffect } from 'react';
import { JsonRpcProvider, formatEther } from 'ethers';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { BadgeDisplay } from '@/components/web3/BadgeDisplay';
import { getReadOnlyReputationContract } from '@/lib/web3/reputationContract';
import { toast } from 'sonner';

const AMOY_RPC          = 'https://rpc-amoy.polygon.technology';
const DONATE_ADDRESS    = process.env.NEXT_PUBLIC_DONATE_CONTRACT;
const ESCROW_ADDRESS    = process.env.NEXT_PUBLIC_ESCROW_CONTRACT;
const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_CONTRACT;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function truncate(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
    >
      <div
        className="p-2 rounded-xl flex-shrink-0"
        style={{ background: color ? `${color}18` : 'rgba(59,107,74,0.1)' }}
      >
        <span
          className="material-symbols-outlined text-[20px]"
          style={{ color: color || 'var(--color-primary-base)' }}
        >
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-on-surface-variant font-medium">{label}</p>
        <p className="text-lg font-black text-on-surface leading-tight mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[10px] text-on-surface-variant/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BlockchainDashboardPage() {
  const { user, profile } = useAuth();
  const {
    address, isConnecting, isLinking, isLinked, connect, linkWallet,
  } = useWallet();

  const [maticBalance, setMaticBalance]   = useState<string | null>(null);
  const [badgeCount,   setBadgeCount]     = useState<number | null>(null);
  const [totalMinted,  setTotalMinted]    = useState<number | null>(null);
  const [loadingStats, setLoadingStats]   = useState(false);

  // Fetch on-chain stats once wallet is known
  useEffect(() => {
    const load = async () => {
      const walletAddr = address || profile?.walletAddress;
      if (!walletAddr) return;

      setLoadingStats(true);
      try {
        const provider = new JsonRpcProvider(AMOY_RPC);

        // MATIC balance
        const balance = await provider.getBalance(walletAddr);
        setMaticBalance(parseFloat(formatEther(balance)).toFixed(4));

        // Badge count
        if (REPUTATION_ADDRESS && REPUTATION_ADDRESS !== 'undefined') {
          const repContract = await getReadOnlyReputationContract();
          const ids: bigint[] = await repContract.getBadgesByOwner(walletAddr);
          setBadgeCount(ids.length);

          const total = await repContract.totalMinted();
          setTotalMinted(Number(total));
        }
      } catch (err) {
        console.error('BlockchainDashboard stats error:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    load();
  }, [address, profile?.walletAddress]);

  const linkedWallet = address || profile?.walletAddress;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* ─── Page header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div
          className="p-2.5 rounded-2xl"
          style={{ background: 'rgba(59,107,74,0.1)', border: '1px solid rgba(59,107,74,0.2)' }}
        >
          <span className="material-symbols-outlined text-[28px]" style={{ color: 'var(--color-primary-base)' }}>
            hub
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-on-surface">Blockchain Hub</h1>
          <p className="text-sm text-on-surface-variant">
            Your on-chain identity, badges, and campaign activity on Polygon.
          </p>
        </div>
      </div>

      {/* ─── Wallet identity card ──────────────────────────────── */}
      <section
        className="rounded-2xl p-5"
        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
          Wallet Identity
        </p>

        {linkedWallet ? (
          <div className="space-y-4">
            {/* Address block */}
            <div
              className="rounded-xl p-3 flex items-center justify-between gap-2"
              style={{ background: 'rgba(59,107,74,0.06)', border: '1px solid rgba(59,107,74,0.12)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">🔗</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {isLinked ? 'Linked Wallet' : 'Connected (not linked)'}
                  </p>
                  <p className="text-sm font-mono font-bold text-on-surface truncate">
                    {truncate(linkedWallet)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(linkedWallet);
                    toast.success('Address copied!');
                  }}
                  className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                  style={{ background: 'rgba(100,100,100,0.1)' }}
                  title="Copy address"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                </button>
                <a
                  href={`https://amoy.polygonscan.com/address/${linkedWallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:opacity-70 transition-opacity text-inherit"
                  style={{ background: 'rgba(100,100,100,0.1)' }}
                  title="View on PolygonScan"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </div>
            </div>

            {/* Link action (if connected but not linked) */}
            {address && !isLinked && (
              <button
                onClick={linkWallet}
                disabled={isLinking}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                  color: '#fff',
                }}
              >
                {isLinking ? 'Signing…' : '🔒 Verify & Link Wallet to Account'}
              </button>
            )}

            {isLinked && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: '#16a34a' }}
              >
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Cryptographically verified — EIP-191 signature on file
              </div>
            )}
          </div>
        ) : (
          // Not connected
          <div className="text-center py-4 space-y-3">
            <div className="text-5xl">🦊</div>
            <p className="text-sm text-on-surface font-semibold">Connect your MetaMask wallet</p>
            <p className="text-xs text-on-surface-variant">
              Link a wallet to earn on-chain reputation badges and participate in milestone escrow campaigns.
            </p>
            <button
              onClick={connect}
              disabled={isConnecting}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                color: '#fff',
              }}
            >
              {isConnecting ? 'Connecting…' : 'Connect MetaMask'}
            </button>
          </div>
        )}
      </section>

      {/* ─── On-chain stats grid ──────────────────────────────── */}
      {linkedWallet && (
        <section>
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
            On-Chain Stats
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon="currency_exchange"
              label="Wallet Balance"
              value={loadingStats ? '…' : `${maticBalance ?? '—'} MATIC`}
              sub="Polygon Amoy Testnet"
              color="#8b5cf6"
            />
            <StatCard
              icon="military_tech"
              label="Your Badges"
              value={loadingStats ? '…' : `${badgeCount ?? '—'}`}
              sub="Soulbound tokens"
              color="#d4a800"
            />
            <StatCard
              icon="people"
              label="Total Badges Minted"
              value={loadingStats ? '…' : `${totalMinted ?? '—'}`}
              sub="All NexusAid members"
            />
            <StatCard
              icon="account_balance"
              label="Network"
              value="Polygon Amoy"
              sub="Chain ID: 80002"
              color="#7c3aed"
            />
          </div>
        </section>
      )}

      {/* ─── Reputation badges ────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Reputation Badges (SBTs)
          </p>
          {REPUTATION_ADDRESS && REPUTATION_ADDRESS !== 'undefined' && (
            <a
              href={`https://amoy.polygonscan.com/address/${REPUTATION_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-on-surface-variant/50 hover:text-primary transition-colors flex items-center gap-0.5"
            >
              Contract
              <span className="material-symbols-outlined text-[10px]">open_in_new</span>
            </a>
          )}
        </div>

        {linkedWallet ? (
          REPUTATION_ADDRESS && REPUTATION_ADDRESS !== 'undefined' ? (
            <BadgeDisplay walletAddress={linkedWallet} />
          ) : (
            <div
              className="rounded-2xl px-4 py-5 text-center text-sm text-on-surface-variant"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
              Reputation contract not deployed yet. Deploy{' '}
              <code className="font-mono text-xs bg-black/20 px-1 py-0.5 rounded">NexusReputation.sol</code>{' '}
              and add <code className="font-mono text-xs">NEXT_PUBLIC_REPUTATION_CONTRACT</code> to{' '}
              <code className="font-mono text-xs">.env.local</code>.
            </div>
          )
        ) : (
          <div
            className="rounded-2xl px-4 py-5 text-center text-sm text-on-surface-variant"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          >
            Connect your wallet to view your reputation badges.
          </div>
        )}
      </section>

      {/* ─── Contract addresses ───────────────────────────────── */}
      <section
        className="rounded-2xl p-4 space-y-2"
        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
      >
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
          Smart Contracts (Polygon Amoy)
        </p>

        {[
          { label: 'NexusDonate',     address: DONATE_ADDRESS,     icon: 'volunteer_activism' },
          { label: 'NexusEscrow',     address: ESCROW_ADDRESS,     icon: 'account_balance' },
          { label: 'NexusReputation', address: REPUTATION_ADDRESS, icon: 'military_tech' },
        ].map(({ label, address: contractAddr, icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(100,100,100,0.04)', border: '1px solid rgba(100,100,100,0.08)' }}
          >
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface">{label}</p>
              <p className="text-[10px] font-mono text-on-surface-variant truncate">
                {contractAddr && contractAddr !== 'undefined' ? contractAddr : 'Not deployed'}
              </p>
            </div>
            {contractAddr && contractAddr !== 'undefined' && (
              <a
                href={`https://amoy.polygonscan.com/address/${contractAddr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-lg hover:opacity-70 transition-opacity"
                style={{ background: 'rgba(100,100,100,0.1)' }}
              >
                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
              </a>
            )}
          </div>
        ))}
      </section>

      {/* ─── Badge tier guide ─────────────────────────────────── */}
      <section>
        <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
          Badge Tier Guide
        </p>
        <div className="space-y-2">
          {[
            { emoji: '🥉', label: 'Bronze',   color: '#cd7f32', desc: 'First donation or 5 volunteer hours' },
            { emoji: '🥈', label: 'Silver',   color: '#aaa9ad', desc: '3 campaigns or 20 volunteer hours' },
            { emoji: '🥇', label: 'Gold',     color: '#d4a800', desc: '7 campaigns or 35 volunteer hours' },
            { emoji: '💠', label: 'Platinum', color: '#6db3b8', desc: '15 campaigns or 60 volunteer hours' },
            { emoji: '⚡', label: 'Master',   color: '#9b59b6', desc: '30 campaigns or 100 volunteer hours' },
            { emoji: '💎', label: 'Diamond',  color: '#00d4ff', desc: 'Exceptional service — admin awarded' },
          ].map(({ emoji, label, color, desc }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{
                background: `${color}10`,
                border: `1px solid ${color}25`,
              }}
            >
              <span className="text-xl">{emoji}</span>
              <div className="flex-1">
                <span className="text-xs font-bold" style={{ color }}>{label}</span>
                <p className="text-[10px] text-on-surface-variant">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
