'use client';
// src/components/BadgeDisplay.tsx
// Renders a user's on-chain Soulbound Token (SBT) badge collection.
// Shows tier badges in a glassmorphism card layout with hover effects.

import { useState, useEffect } from 'react';
import { getReadOnlyReputationContract, BADGE_TIERS, BadgeTierConfig } from '@/lib/web3/reputationContract';

interface Badge {
  tokenId: number;
  badgeType: string;
  mintedAt: number;
  tier: BadgeTierConfig;
}

interface BadgeDisplayProps {
  walletAddress: string;
  compact?: boolean; // show only emojis, no labels
}

const TIER_ORDER = ['diamond', 'master', 'platinum', 'gold', 'silver', 'bronze', 'organizer', 'first_donation'];

export function BadgeDisplay({ walletAddress, compact = false }: BadgeDisplayProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!walletAddress) return;
      try {
        setLoading(true);
        const contract = await getReadOnlyReputationContract();
        
        // Check if contract exists at address to avoid BAD_DATA (0x) errors
        const address = await contract.getAddress();
        const provider = (contract.runner as any)?.provider || contract.runner;
        const code = await (provider as any)?.getCode?.(address);
        
        if (!code || code === '0x') {
          // Contract not deployed yet (e.g., local node just started) — show empty state silently
          setLoading(false);
          return;
        }

        const tokenIds: bigint[] = await contract.getBadgesByOwner(walletAddress);

        const results = await Promise.all(
          tokenIds.map(async (id) => {
            const [badgeType, , mintedAt] = await contract.getBadgeInfo(id);
            return {
              tokenId: Number(id),
              badgeType: badgeType as string,
              mintedAt: Number(mintedAt),
              tier: BADGE_TIERS[badgeType as string] || {
                type:        badgeType,
                label:       badgeType,
                color:       '#888',
                bg:          'rgba(100,100,100,0.1)',
                border:      'rgba(100,100,100,0.2)',
                emoji:       '⭐',
                description: badgeType,
              },
            };
          })
        );

        // Sort by tier priority
        results.sort((a, b) => {
          const ai = TIER_ORDER.indexOf(a.badgeType);
          const bi = TIER_ORDER.indexOf(b.badgeType);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        setBadges(results);
      } catch (err: any) {
        console.error('BadgeDisplay error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [walletAddress]);

  // Compact mode: just show emoji row
  if (compact) {
    if (loading) return <span className="text-xs text-on-surface-variant/50">Loading…</span>;
    if (badges.length === 0) return <span className="text-xs text-on-surface-variant/40">No badges yet</span>;

    return (
      <div className="flex flex-wrap gap-1">
        {badges.map((badge) => (
          <span
            key={badge.tokenId}
            title={`${badge.tier.label} — ${badge.tier.description}`}
            className="text-lg cursor-default select-none hover:scale-125 transition-transform duration-200"
          >
            {badge.tier.emoji}
          </span>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-on-surface-variant/60">
        <span className="animate-spin rounded-full h-3 w-3 border border-outline-variant border-t-primary" />
        Reading badges from chain…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-400 py-2">
        Failed to load badges. Contract may not be deployed yet.
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div
        className="rounded-2xl px-4 py-6 text-center"
        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
      >
        <div className="text-4xl mb-2">🏅</div>
        <p className="text-sm font-semibold text-on-surface">No badges yet</p>
        <p className="text-xs text-on-surface-variant mt-1">
          Earn your first badge by donating or volunteering at a NexusAid event.
        </p>
      </div>
    );
  }

  // Determine the highest tier badge
  const highestBadge = badges[0];

  return (
    <div className="space-y-3">
      {/* Highest badge hero card */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${highestBadge.tier.bg}, rgba(0,0,0,0.0))`,
          border: `1.5px solid ${highestBadge.tier.border}`,
        }}
      >
        <div
          className="absolute top-0 right-0 text-[90px] opacity-10 leading-none pointer-events-none select-none"
        >
          {highestBadge.tier.emoji}
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <span className="text-4xl">{highestBadge.tier.emoji}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: highestBadge.tier.color }}>
              Highest Tier
            </p>
            <p className="text-lg font-black text-on-surface">{highestBadge.tier.label}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{highestBadge.tier.description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 relative z-10">
          <span className="text-[10px] font-mono text-on-surface-variant">
            Token #{highestBadge.tokenId} · Soulbound
          </span>
          <a
            href={`https://amoy.polygonscan.com/address/${process.env.NEXT_PUBLIC_REPUTATION_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] hover:opacity-80 transition-opacity flex items-center gap-0.5"
            style={{ color: highestBadge.tier.color }}
          >
            View on-chain
            <span className="material-symbols-outlined text-[10px]">open_in_new</span>
          </a>
        </div>
      </div>

      {/* All badges grid */}
      {badges.length > 1 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            All Badges ({badges.length})
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {badges.map((badge) => (
              <div
                key={badge.tokenId}
                className="rounded-xl px-3 py-2.5 flex items-center gap-2 transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  background: badge.tier.bg,
                  border: `1px solid ${badge.tier.border}`,
                }}
              >
                <span className="text-xl flex-shrink-0">{badge.tier.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: badge.tier.color }}>
                    {badge.tier.label}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    #{badge.tokenId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
