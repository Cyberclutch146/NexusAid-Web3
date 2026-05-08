'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getEventsByOrganizer, getRegisteredEvents, backfillEventCoordinates } from '@/services/eventService';
import { CommunityEvent } from '@/types';
import Image from 'next/image';
import { SentinelAlert } from '@/types/sentinel';
import { isPointInPolygon, getDistanceMiles } from '@/utils/geo';

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<CommunityEvent[]>([]);
  const [alerts, setAlerts] = useState<SentinelAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [backfilling, setBackfilling] = useState(false);

  const handleBackfill = async () => {
    if (!confirm('This will sequentially geocode all events missing coordinates. It takes ~1.5s per event. Continue?')) return;
    setBackfilling(true);
    try {
      const res = await backfillEventCoordinates();
      alert(`Backfill complete: Updated ${res.updated}, Failed ${res.failed} out of ${res.total} total events.`);
    } catch (err) {
      alert('Error backfilling: ' + String(err));
    } finally {
      setBackfilling(false);
    }
  };

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      try {
        const [organizedData, registeredData, alertsData] = await Promise.all([
          getEventsByOrganizer(user.uid),
          getRegisteredEvents(user.uid),
          fetch('/api/sentinel').then(res => res.ok ? res.json() : [])
        ]);
        setEvents(organizedData);
        setRegisteredEvents(registeredData);
        setAlerts(alertsData);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // ── Aggregate Stats ──
  const totalRaised = events.reduce((sum, e) => sum + (e.needs?.funds?.current ?? 0), 0);
  const totalVolunteers = events.reduce((sum, e) => sum + (e.needs?.volunteers?.current ?? 0), 0);
  const activeCount = events.filter(e => e.status === 'active').length;
  const highRiskAlertsCount = alerts.filter(a => a.severity === 'Extreme' || a.severity === 'Severe').length;

  if (!user) {
    return (
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full pb-32 md:pb-10 flex justify-center items-center">
        <p className="text-on-surface-variant font-medium">Please sign in to view your dashboard.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full pb-32 md:pb-10 flex justify-center items-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="absolute inset-0 rounded-full animate-subtle-pulse" style={{ boxShadow: '0 0 30px rgba(59,107,74,0.15)' }} />
        </div>
      </main>
    );
  }

  const statCards = [
    { label: 'Active Events', value: activeCount, icon: 'campaign', color: 'rgba(59,107,74,0.12)', iconColor: 'var(--color-primary-base)' },
    { label: 'Total Raised', value: `$${totalRaised.toLocaleString()}`, icon: 'attach_money', color: 'rgba(139,109,46,0.12)', iconColor: 'var(--color-warm-amber)' },
    { label: 'Volunteers Recruited', value: totalVolunteers, icon: 'group', color: 'rgba(194,113,91,0.12)', iconColor: 'var(--color-terracotta)' },
    { label: 'Severe Alerts', value: highRiskAlertsCount, icon: 'warning', color: 'rgba(184,50,48,0.1)', iconColor: 'var(--color-error-base)' },
  ];

  return (
    <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full pb-32 md:pb-10">
      <div className="mb-10 animate-fade-in-up">
        <h2 className="text-4xl md:text-5xl font-serif tracking-tight text-gradient-earth">Your Community Impact</h2>
        <p className="text-on-surface-variant font-medium mt-2">
          Welcome back, {profile?.displayName || 'Organizer'}. Here&apos;s a snapshot of your local support efforts.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 mb-10">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className="premium-glass p-4 min-[430px]:p-5 animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="mb-3 flex items-center gap-2.5 min-[430px]:gap-3">
              <span
                className="material-symbols-outlined rounded-xl px-2 py-1.5 text-[18px] min-[430px]:px-2.5 min-[430px]:py-2 min-[430px]:text-[20px]"
                style={{ background: stat.color, color: stat.iconColor }}
              >
                {stat.icon}
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant min-[430px]:text-xs min-[430px]:tracking-wider">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-on-surface min-[430px]:text-3xl md:text-4xl">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Events Grid ── */}
      <div className="mb-6 flex flex-col gap-3 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between animate-fade-in-up delay-300">
        <h3 className="font-headline text-xl font-bold text-on-surface">Your Events</h3>
        <div className="flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center">
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="premium-button-muted text-sm gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            {backfilling ? 'Refreshing...' : 'Refresh Coordinates'}
          </button>
          <button
            onClick={() => router.push('/create')}
            className="premium-button-primary text-sm gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Event
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="premium-glass-strong p-8 flex flex-col items-center justify-center text-center py-16 animate-fade-in-up delay-400">
          <span className="material-symbols-outlined text-[64px] mb-4" style={{ color: 'var(--color-outline-variant-base)' }}>volunteer_activism</span>
          <h3 className="font-headline text-xl text-on-surface font-bold mb-2">No events yet</h3>
          <p className="text-on-surface-variant max-w-md mb-6">
            You haven&apos;t organized any events yet. Start a local initiative and rally your community!
          </p>
          <button
            onClick={() => router.push('/create')}
            className="premium-button-primary text-sm"
          >
            Create Your First Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {events.map(event => (
            <EventCard key={event.id} event={event} alerts={alerts} onClick={() => router.push(`/dashboard/event/${event.id}`)} />
          ))}
        </div>
      )}

      {/* ── Registered Events Section ── */}
      {registeredEvents.length > 0 && (
        <div className="mt-16 animate-fade-in-up">
          <div className="mb-6">
            <h3 className="font-headline text-xl font-bold text-on-surface">Events You&apos;re Supporting</h3>
            <p className="text-on-surface-variant text-sm mt-1">Local initiatives you&apos;re helping through volunteer support.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {registeredEvents.map(event => (
              <EventCard key={event.id} event={event} alerts={alerts} onClick={() => router.push(`/event/${event.id}`)} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

// ── Helper Component for Event Cards ──
function EventCard({ event, alerts, onClick }: { event: CommunityEvent, alerts: SentinelAlert[], onClick: () => void }) {
  const fundPercent = event.needs?.funds ? Math.min(100, Math.round((event.needs.funds.current / event.needs.funds.goal) * 100)) : null;
  const volPercent = event.needs?.volunteers ? Math.min(100, Math.round((event.needs.volunteers.current / event.needs.volunteers.goal) * 100)) : null;

  const intersectingAlerts = alerts.filter((alert: SentinelAlert) => {
    if (!event.lat || !event.lng) return false;
    if (alert.polygon && alert.polygon.length > 0) {
      return isPointInPolygon({ lat: event.lat, lng: event.lng }, alert.polygon);
    } else if (alert.coordinates) {
      const dist = getDistanceMiles(event.lat, event.lng, alert.coordinates.lat, alert.coordinates.lng);
      return dist <= 30;
    }
    return false;
  });
  const hasAlerts = intersectingAlerts.length > 0;

  return (
    <button
      onClick={onClick}
      className="rounded-[24px] overflow-hidden text-left transition-all duration-300 group flex flex-col h-full hover:-translate-y-1"
      style={{
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={event.imageUrl || '/logo.svg'}
          alt={event.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {hasAlerts && (
          <span className={`absolute top-3 ${event.status === 'active' ? 'right-24' : 'right-28'} text-xs font-bold px-3 py-1 rounded-full bg-red-500/90 text-white flex items-center gap-1`} style={{ boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}>
            <span className="material-symbols-outlined text-[14px]">warning</span> Alert
          </span>
        )}
        <span
          className="absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full"
          style={event.status === 'active' ? {
            background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
            color: 'var(--color-on-primary-base)',
            boxShadow: '0 2px 8px rgba(59,107,74,0.25)',
          } : {
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(12px)',
            color: 'var(--color-on-surface-variant-base)',
            border: '1px solid var(--glass-border)',
          }}
        >
          {event.status === 'active' ? 'Active' : 'Completed'}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div>
          <h4 className="font-headline font-bold text-on-surface mb-1 line-clamp-1">{event.title}</h4>
          <p className="text-on-surface-variant text-sm mb-4">{event.category}</p>
        </div>

        {fundPercent !== null && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-on-surface-variant font-medium">Funds</span>
              <span className="font-bold" style={{ color: 'var(--color-primary-base)' }}>{fundPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-variant-base)' }}>
              <div className="h-full rounded-full transition-all duration-700 progress-glow" style={{ width: `${fundPercent}%`, background: 'linear-gradient(90deg, var(--color-primary-base), var(--color-sage))' }} />
            </div>
          </div>
        )}

        {volPercent !== null && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-on-surface-variant font-medium">Volunteers</span>
              <span className="font-bold" style={{ color: 'var(--color-warm-amber)' }}>{volPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-variant-base)' }}>
              <div className="h-full rounded-full transition-all duration-700 progress-glow-amber" style={{ width: `${volPercent}%`, background: 'linear-gradient(90deg, var(--color-warm-amber), var(--color-earth-gold))' }} />
            </div>
          </div>
        )}

        <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <span className="font-bold text-sm tracking-[0.06em] uppercase" style={{ color: 'var(--color-primary-base)' }}>View details</span>
        </div>
      </div>
    </button>
  );
}
