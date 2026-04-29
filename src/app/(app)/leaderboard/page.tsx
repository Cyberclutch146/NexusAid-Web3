'use client';

import { useState, useEffect } from 'react';
import { getGlobalLeaderboard, getLeaderboardStats, LeaderboardEntry } from '@/services/userService';
import { getUserAvatar } from '@/lib/avatar';
import Image from 'next/image';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState({ totalVolunteers: 0, totalHours: 0, totalDonated: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'impact' | 'hours' | 'donated'>('impact');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [leaderboard, globalStats] = await Promise.all([
          getGlobalLeaderboard(50),
          getLeaderboardStats(),
        ]);
        setEntries(leaderboard);
        setStats(globalStats);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const sortedEntries = [...entries].sort((a, b) => {
    if (activeTab === 'hours') return b.volunteerHours - a.volunteerHours;
    if (activeTab === 'donated') return b.totalDonated - a.totalDonated;
    return b.impactScore - a.impactScore;
  });

  const topThree = sortedEntries.slice(0, 3);
  const rest = sortedEntries.slice(3);

  const medalColors = [
    { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', shadow: 'rgba(255,215,0,0.3)', text: '#92400e', icon: '🥇' },
    { bg: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', shadow: 'rgba(192,192,192,0.3)', text: '#374151', icon: '🥈' },
    { bg: 'linear-gradient(135deg, #CD7F32, #B8860B)', shadow: 'rgba(205,127,50,0.3)', text: '#78350f', icon: '🥉' },
  ];

  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full pb-28 md:pb-10 flex justify-center items-center min-h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 rounded-full animate-subtle-pulse" style={{ boxShadow: '0 0 30px rgba(59,107,74,0.15)' }} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-10 max-w-5xl mx-auto w-full pb-28 md:pb-10">
      {/* Hero Header */}
      <div className="text-center mb-10 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
          style={{ background: 'rgba(59,107,74,0.1)', color: 'var(--color-primary-base)' }}
        >
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
          Community Heroes
        </div>
        <h1 className="font-headline text-4xl md:text-6xl font-bold text-gradient-earth mb-3 tracking-tight">
          Leaderboard
        </h1>
        <p className="text-on-surface-variant text-base md:text-lg max-w-md mx-auto leading-relaxed">
          Celebrating our most impactful community members who make a difference every day.
        </p>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10 animate-fade-in-up delay-100">
        <div className="premium-glass p-5 text-center">
          <span className="material-symbols-outlined text-2xl mb-2 block" style={{ color: 'var(--color-primary-base)', fontVariationSettings: "'FILL' 1" }}>groups</span>
          <p className="text-2xl md:text-3xl font-bold text-on-surface">{stats.totalVolunteers}</p>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Volunteers</p>
        </div>
        <div className="premium-glass p-5 text-center">
          <span className="material-symbols-outlined text-2xl mb-2 block" style={{ color: 'var(--color-warm-amber)', fontVariationSettings: "'FILL' 1" }}>schedule</span>
          <p className="text-2xl md:text-3xl font-bold text-on-surface">{stats.totalHours.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Hours Given</p>
        </div>
        <div className="premium-glass p-5 text-center">
          <span className="material-symbols-outlined text-2xl mb-2 block" style={{ color: 'var(--color-sage)', fontVariationSettings: "'FILL' 1" }}>paid</span>
          <p className="text-2xl md:text-3xl font-bold text-on-surface">${stats.totalDonated.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Donated</p>
        </div>
      </div>

      {/* Sort Tabs */}
      <div className="flex items-center gap-2 mb-8 animate-fade-in-up delay-200">
        {[
          { key: 'impact' as const, label: 'Impact Score', icon: 'star' },
          { key: 'hours' as const, label: 'Hours', icon: 'schedule' },
          { key: 'donated' as const, label: 'Donations', icon: 'paid' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-all duration-300 ${
              activeTab === tab.key ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
            }`}
            style={activeTab === tab.key ? {
              background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
              boxShadow: '0 3px 12px rgba(59, 107, 74, 0.25)',
            } : undefined}
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: activeTab === tab.key ? "'FILL' 1" : "'FILL' 0" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 premium-glass animate-fade-in-up delay-300">
          <span className="material-symbols-outlined text-6xl mb-4 block" style={{ color: 'var(--color-outline-base)' }}>emoji_events</span>
          <h3 className="text-xl font-bold text-on-surface mb-2">No Heroes Yet</h3>
          <p className="text-on-surface-variant mb-6">Be the first to volunteer and climb the leaderboard!</p>
          <Link href="/feed" className="premium-button-primary inline-flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-base">explore</span>
            Browse Events
          </Link>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {topThree.length > 0 && (
            <div className="flex items-end justify-center gap-4 mb-12 animate-fade-in-up delay-300">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center w-28 md:w-36">
                  <div className="text-3xl mb-2">{medalColors[1].icon}</div>
                  <div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-bold text-xl mb-2 overflow-hidden"
                    style={{ background: medalColors[1].bg, boxShadow: `0 4px 20px ${medalColors[1].shadow}`, outline: '4px solid rgba(192,192,192,0.3)', outlineOffset: '-1px' }}
                  >
                    {topThree[1].avatarUrl ? (
                      <Image src={getUserAvatar(topThree[1].avatarUrl, topThree[1].displayName)} alt={topThree[1].displayName} width={80} height={80} className="object-cover w-full h-full" />
                    ) : (
                      <span style={{ color: medalColors[1].text }}>{topThree[1].displayName.charAt(0)}</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-on-surface text-center truncate w-full">{topThree[1].displayName}</p>
                  <p className="text-xs text-on-surface-variant font-mono">{getStatValue(topThree[1], activeTab)}</p>
                  <div className="w-full h-20 rounded-t-2xl mt-2" style={{ background: 'rgba(192,192,192,0.12)', border: '1px solid rgba(192,192,192,0.2)' }} />
                </div>
              )}
              
              {/* 1st Place */}
              {topThree[0] && (
                <div className="flex flex-col items-center w-32 md:w-40 -mb-4">
                  <div className="text-4xl mb-2">{medalColors[0].icon}</div>
                  <div
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center font-bold text-2xl mb-2 overflow-hidden"
                    style={{ background: medalColors[0].bg, boxShadow: `0 6px 30px ${medalColors[0].shadow}`, outline: '4px solid rgba(255,215,0,0.3)', outlineOffset: '-1px' }}
                  >
                    {topThree[0].avatarUrl ? (
                      <Image src={getUserAvatar(topThree[0].avatarUrl, topThree[0].displayName)} alt={topThree[0].displayName} width={96} height={96} className="object-cover w-full h-full" />
                    ) : (
                      <span style={{ color: medalColors[0].text }}>{topThree[0].displayName.charAt(0)}</span>
                    )}
                  </div>
                  <p className="text-base font-bold text-on-surface text-center truncate w-full">{topThree[0].displayName}</p>
                  <p className="text-xs text-on-surface-variant font-mono">{getStatValue(topThree[0], activeTab)}</p>
                  <div className="w-full h-28 rounded-t-2xl mt-2" style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }} />
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center w-28 md:w-36">
                  <div className="text-3xl mb-2">{medalColors[2].icon}</div>
                  <div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-bold text-xl mb-2 overflow-hidden"
                    style={{ background: medalColors[2].bg, boxShadow: `0 4px 20px ${medalColors[2].shadow}`, outline: '4px solid rgba(205,127,50,0.3)', outlineOffset: '-1px' }}
                  >
                    {topThree[2].avatarUrl ? (
                      <Image src={getUserAvatar(topThree[2].avatarUrl, topThree[2].displayName)} alt={topThree[2].displayName} width={80} height={80} className="object-cover w-full h-full" />
                    ) : (
                      <span style={{ color: medalColors[2].text }}>{topThree[2].displayName.charAt(0)}</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-on-surface text-center truncate w-full">{topThree[2].displayName}</p>
                  <p className="text-xs text-on-surface-variant font-mono">{getStatValue(topThree[2], activeTab)}</p>
                  <div className="w-full h-14 rounded-t-2xl mt-2" style={{ background: 'rgba(205,127,50,0.1)', border: '1px solid rgba(205,127,50,0.2)' }} />
                </div>
              )}
            </div>
          )}

          {/* Rest of the leaderboard */}
          {rest.length > 0 && (
            <div className="premium-glass-strong overflow-hidden animate-fade-in-up delay-400">
              <div className="p-5" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <h3 className="font-serif text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl" style={{ color: 'var(--color-primary-base)', fontVariationSettings: "'FILL' 1" }}>leaderboard</span>
                  Full Rankings
                </h3>
              </div>
              <div>
                {rest.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-container/30"
                    style={{ borderBottom: '1px solid var(--glass-border)' }}
                  >
                    <span className="w-8 text-center text-sm font-bold text-on-surface-variant">
                      #{index + 4}
                    </span>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-primary-container-base), var(--color-sage))',
                        color: 'var(--color-on-primary-container-base)',
                      }}
                    >
                      {entry.avatarUrl ? (
                        <Image src={getUserAvatar(entry.avatarUrl, entry.displayName)} alt={entry.displayName} width={40} height={40} className="object-cover w-full h-full" />
                      ) : (
                        entry.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{entry.displayName}</p>
                      {entry.location && (
                        <p className="text-xs text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {entry.location}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--color-primary-base)' }}>
                        {getStatValue(entry, activeTab)}
                      </p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
                        {activeTab === 'hours' ? 'hours' : activeTab === 'donated' ? 'donated' : 'score'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function getStatValue(entry: LeaderboardEntry, tab: 'impact' | 'hours' | 'donated'): string {
  if (tab === 'hours') return `${entry.volunteerHours}h`;
  if (tab === 'donated') return `$${entry.totalDonated.toLocaleString()}`;
  return entry.impactScore.toLocaleString();
}
