'use client';
// src/app/(app)/dashboard/blockchain/page.tsx
// NexusAid Blockchain Identity Hub

import { useState, useEffect } from 'react';
import { JsonRpcProvider, formatEther } from 'ethers';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { BadgeDisplay } from '@/components/web3/BadgeDisplay';
import { getReadOnlyReputationContract } from '@/lib/web3/reputationContract';
import { toast } from 'sonner';

const AMOY_RPC          = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology';
const DONATE_ADDRESS    = process.env.NEXT_PUBLIC_DONATE_CONTRACT;
const ESCROW_ADDRESS    = process.env.NEXT_PUBLIC_ESCROW_CONTRACT;
const REPUTATION_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_CONTRACT;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function truncate(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

// ─── Components ───────────────────────────────────────────────────────────────
function BentoBox({ children, className = '', style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  return (
    <section 
      className={`rounded-[32px] p-6 relative overflow-hidden transition-all duration-500 hover:shadow-[0_12px_48px_rgba(42,45,43,0.08)] ${className}`}
      style={{ 
        background: 'var(--glass-bg)', 
        border: '1px solid var(--glass-border)',
        boxShadow: '0 8px 32px rgba(42, 45, 43, 0.04)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        ...style
      }}
    >
      {children}
    </section>
  );
}

function StatBento({
  icon, label, value, sub, color, className = '', loading = false
}: {
  icon: string; label: string; value: string; sub?: string; color?: string; className?: string; loading?: boolean;
}) {
  return (
    <BentoBox className={`${className} flex flex-col justify-between group`}>
      <div className="flex items-start justify-between mb-4">
        <div 
          className="p-3 rounded-[20px] transition-transform duration-500 ease-out group-hover:scale-110 group-hover:-rotate-3"
          style={{ background: color ? `${color}18` : 'rgba(59,107,74,0.1)' }}
        >
          <span 
            className="material-symbols-outlined text-[28px]"
            style={{ color: color || 'var(--color-primary-base)' }}
          >
            {icon}
          </span>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{label}</p>
        <p className="text-3xl font-black text-on-surface leading-tight mt-1 truncate">
          {loading ? '—' : value}
        </p>
        {sub && <p className="text-[11px] font-medium text-on-surface-variant/70 mt-1 uppercase tracking-wider">{sub}</p>}
      </div>
    </BentoBox>
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
  const [networkInfo,  setNetworkInfo]    = useState({ name: 'Checking...', chainId: 0 });
  const [loadingStats, setLoadingStats]   = useState(false);
  const [isClaiming,   setIsClaiming]     = useState(false);

  const handleClaimBadges = async () => {
    const walletAddr = address || profile?.walletAddress;
    if (!walletAddr || !user) return;

    setIsClaiming(true);
    const loadingToast = toast.loading('Evaluating metrics and generating badges...');

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/web3/claim-badge', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ recipientAddress: walletAddr }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to claim badges');

      if (data.claimed && data.claimed.length > 0) {
        toast.success(data.message, { id: loadingToast });
        if (badgeCount !== null) setBadgeCount(badgeCount + data.claimed.length);
        if (totalMinted !== null) setTotalMinted(totalMinted + data.claimed.length);
      } else {
        toast.info(data.message || 'No new badges to claim right now.', { id: loadingToast });
      }
    } catch (error: any) {
      toast.error(`Error claiming badges: ${error.message}`, { id: loadingToast });
    } finally {
      setIsClaiming(false);
    }
  };

  // Fetch on-chain stats once wallet is known
  useEffect(() => {
    const load = async () => {
      const walletAddr = address || profile?.walletAddress;
      if (!walletAddr) return;

      setLoadingStats(true);
      try {
        const provider = new JsonRpcProvider(AMOY_RPC);

        // Network detection
        const network = await provider.getNetwork();
        setNetworkInfo({
          name: network.chainId === 31337n ? 'Hardhat' : network.chainId === 80002n ? 'Amoy' : 'Unknown',
          chainId: Number(network.chainId)
        });

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
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      
      {/* ─── Page header ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8">
        <div
          className="p-3.5 rounded-[24px] shadow-sm"
          style={{ 
            background: 'linear-gradient(135deg, rgba(59,107,74,0.15), rgba(59,107,74,0.05))', 
            border: '1px solid rgba(59,107,74,0.2)' 
          }}
        >
          <span className="material-symbols-outlined text-[32px]" style={{ color: 'var(--color-primary-base)' }}>
            hub
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Blockchain Hub</h1>
          <p className="text-base font-medium text-on-surface-variant mt-1">
            Your decentralized identity, badges, and campaign activity on Polygon.
          </p>
        </div>
      </div>

      {/* ─── Bento Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        
        {/* Wallet Identity Bento */}
        <BentoBox className="lg:col-span-2 lg:row-span-2 flex flex-col justify-between group" style={{
          background: 'linear-gradient(145deg, color-mix(in srgb, var(--color-surface-base) 90%, transparent), color-mix(in srgb, var(--color-primary-container-base) 10%, transparent))'
        }}>
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  Wallet Identity
                </p>
              </div>
              {linkedWallet && (
                <div className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  {isLinked ? 'Linked & Verified' : 'Connected'}
                </div>
              )}
            </div>

            {linkedWallet ? (
              <div className="space-y-6">
                <div className="relative group/copy cursor-pointer" onClick={() => {
                  navigator.clipboard.writeText(linkedWallet);
                  toast.success('Address copied!');
                }}>
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/20 via-terracotta/20 to-primary/20 opacity-0 group-hover/copy:opacity-100 transition-opacity duration-500 blur-md"></div>
                  <div 
                    className="relative rounded-[24px] p-5 flex items-center justify-between gap-4 transition-transform duration-300 group-hover/copy:-translate-y-0.5"
                    style={{ background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                        Polygon Address
                      </p>
                      <p className="text-2xl font-mono font-bold text-on-surface truncate">
                        {truncate(linkedWallet)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-surface-container/50 text-on-surface-variant group-hover/copy:bg-primary/10 group-hover/copy:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">content_copy</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <a
                    href={`https://amoy.polygonscan.com/address/${linkedWallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex justify-center items-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-95 bg-surface-container/50 text-on-surface hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    View Explorer
                  </a>
                  {address && !isLinked && (
                    <button
                      onClick={linkWallet}
                      disabled={isLinking}
                      className="flex-1 flex justify-center items-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 text-white"
                      style={{ background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))', boxShadow: '0 4px 14px rgba(59,107,74,0.3)' }}
                    >
                      {isLinking ? 'Signing…' : 'Link to Account'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 px-4">
                <div className="w-20 h-20 mx-auto mb-4 bg-surface-container rounded-full flex items-center justify-center shadow-inner">
                  <span className="text-4xl">🦊</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface mb-2">No Wallet Connected</h3>
                <p className="text-sm text-on-surface-variant mb-6 max-w-xs mx-auto">
                  Connect MetaMask to unlock on-chain reputation badges and participate in decentralized campaigns.
                </p>
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className="w-full py-4 rounded-2xl text-sm font-bold transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 text-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))', boxShadow: '0 8px 24px rgba(59,107,74,0.3)' }}
                >
                  {isConnecting ? 'Connecting…' : 'Connect MetaMask'}
                </button>
              </div>
            )}
          </div>
          
          {isLinked && (
            <div className="mt-6 pt-5 border-t border-glass flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-green-600/80">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              EIP-191 Cryptographic Signature Verified
            </div>
          )}
        </BentoBox>

        {/* Stats Bentos */}
        {linkedWallet && (
          <>
            <StatBento
              className="lg:col-span-1 lg:row-span-1"
              icon="currency_exchange"
              label="Wallet Balance"
              value={loadingStats ? '…' : `${maticBalance ?? '—'} MATIC`}
              sub="Polygon Amoy Testnet"
              color="#8b5cf6"
              loading={loadingStats}
            />
            <StatBento
              className="lg:col-span-1 lg:row-span-1"
              icon="military_tech"
              label="Your Badges"
              value={loadingStats ? '…' : `${badgeCount ?? '—'}`}
              sub="Soulbound tokens"
              color="#d4a800"
              loading={loadingStats}
            />
            <StatBento
              className="lg:col-span-1 lg:row-span-1"
              icon="people"
              label="Global Mints"
              value={loadingStats ? '…' : `${totalMinted ?? '—'}`}
              sub="All NexusAid Members"
              color="#10b981"
              loading={loadingStats}
            />
            <StatBento
              className="lg:col-span-1 lg:row-span-1"
              icon="account_balance"
              label="Network"
              value={networkInfo.name}
              sub={`Chain ID: ${networkInfo.chainId}`}
              color="#3b82f6"
            />
          </>
        )}

        {/* Reputation Badges Bento */}
        <BentoBox className="lg:col-span-3 lg:row-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
              </div>
              <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
                Reputation Badges (SBTs)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {linkedWallet && REPUTATION_ADDRESS && REPUTATION_ADDRESS !== 'undefined' && (
                <button
                  onClick={handleClaimBadges}
                  disabled={isClaiming}
                  className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md disabled:opacity-50 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #d4a800, #b45309)' }}
                >
                  {isClaiming ? (
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">stars</span>
                  )}
                  {isClaiming ? 'Claiming...' : 'Claim Eligible Badges'}
                </button>
              )}
              {REPUTATION_ADDRESS && REPUTATION_ADDRESS !== 'undefined' && (
                <a
                  href={`https://amoy.polygonscan.com/address/${REPUTATION_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container/50 text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1.5"
                >
                  Contract
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {linkedWallet ? (
              REPUTATION_ADDRESS && REPUTATION_ADDRESS !== 'undefined' ? (
                <div className="h-full min-h-[250px]">
                  <BadgeDisplay walletAddress={linkedWallet} />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface-container/30 rounded-[24px] border border-glass border-dashed">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-4">code_blocks</span>
                  <h3 className="text-base font-bold text-on-surface mb-2">Contract Not Deployed</h3>
                  <p className="text-sm text-on-surface-variant max-w-sm">
                    Deploy <code className="font-mono text-xs bg-black/10 px-1.5 py-0.5 rounded">NexusReputation.sol</code> and configure your environment variables to enable badges.
                  </p>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface-container/30 rounded-[24px] border border-glass border-dashed">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 mb-4">lock</span>
                <h3 className="text-base font-bold text-on-surface mb-2">Authentication Required</h3>
                <p className="text-sm text-on-surface-variant">Connect your wallet to view your earned reputation badges.</p>
              </div>
            )}
          </div>
        </BentoBox>

        {/* Smart Contracts Bento */}
        <BentoBox className="lg:col-span-1 lg:row-span-2 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <span className="material-symbols-outlined text-[24px]">developer_board</span>
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
              Contracts
            </p>
          </div>
          
          <div className="flex-1 space-y-3">
            {[
              { label: 'NexusDonate',     address: DONATE_ADDRESS,     icon: 'volunteer_activism' },
              { label: 'NexusEscrow',     address: ESCROW_ADDRESS,     icon: 'account_balance' },
              { label: 'NexusReputation', address: REPUTATION_ADDRESS, icon: 'military_tech' },
            ].map(({ label, address: contractAddr, icon }) => (
              <div
                key={label}
                className="group p-4 rounded-[20px] transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                style={{ background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{icon}</span>
                  <p className="text-sm font-bold text-on-surface">{label}</p>
                </div>
                <div className="flex items-center justify-between gap-2 bg-surface-container/40 p-2.5 rounded-xl">
                  <p className="text-[10px] font-mono font-medium text-on-surface-variant truncate">
                    {contractAddr && contractAddr !== 'undefined' ? contractAddr : 'Not deployed'}
                  </p>
                  {contractAddr && contractAddr !== 'undefined' && (
                    <a
                      href={`https://amoy.polygonscan.com/address/${contractAddr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-surface-container text-on-surface hover:text-primary transition-colors flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </BentoBox>

        {/* Badge Tier Guide Bento */}
        <BentoBox className="lg:col-span-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
              <span className="material-symbols-outlined text-[24px]">hotel_class</span>
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
              Badge Tier Guide
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { emoji: '🥉', label: 'Bronze',   color: '#cd7f32', desc: '1st donation or 5 hours' },
              { emoji: '🥈', label: 'Silver',   color: '#9ca3af', desc: '3 campaigns or 20 hours' },
              { emoji: '🥇', label: 'Gold',     color: '#d4a800', desc: '7 campaigns or 35 hours' },
              { emoji: '💠', label: 'Platinum', color: '#6db3b8', desc: '15 campaigns or 60 hours' },
              { emoji: '⚡', label: 'Master',   color: '#9b59b6', desc: '30 campaigns or 100 hours' },
              { emoji: '💎', label: 'Diamond',  color: '#0ea5e9', desc: 'Exceptional service' },
            ].map(({ emoji, label, color, desc }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center p-4 rounded-[24px] text-center transition-transform hover:-translate-y-1"
                style={{
                  background: `linear-gradient(145deg, ${color}10, transparent)`,
                  border: `1px solid ${color}20`,
                }}
              >
                <span className="text-3xl mb-2 filter drop-shadow-md">{emoji}</span>
                <span className="text-xs font-black uppercase tracking-wider mb-1" style={{ color }}>{label}</span>
                <p className="text-[10px] font-medium text-on-surface-variant leading-tight">{desc}</p>
              </div>
            ))}
          </div>
        </BentoBox>

      </div>
    </div>
  );
}
