'use client';

import { useState, useEffect, useMemo } from 'react';
import { SentinelAlert } from '@/types/sentinel';
import SentinelAlertFeed from '@/components/SentinelAlertFeed';
import { Activity, Map as MapIcon, Loader2, ShieldAlert, Radio, TriangleAlert, Waves, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Use dynamic import for the map to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center rounded-xl" style={{ background: 'var(--glass-bg)' }}><Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-outline-base)' }} /></div> }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const SentinelMapOverlay = dynamic(
  () => import('@/components/SentinelMapOverlay'),
  { ssr: false }
);

export default function SentinelDashboardPage() {
  const [alerts, setAlerts] = useState<SentinelAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'feed'>('map');
  const { resolvedTheme } = useTheme();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sentinel');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error("Failed to fetch Sentinel data", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAlerts();
    
    // Poll every 5 minutes
    const interval = setInterval(fetchAlerts, 300000);
    return () => clearInterval(interval);
  }, []);

  const tileUrl = resolvedTheme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  const metrics = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter((alert) => alert.severity === 'Extreme' || alert.severity === 'Severe').length;
    const weather = alerts.filter((alert) => alert.type === 'WEATHER').length;
    const latestTimestamp = alerts[0]?.timestamp;

    return {
      total,
      critical,
      weather,
      latestUpdate: latestTimestamp
        ? new Date(latestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Waiting',
    };
  }, [alerts]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-5 md:gap-6 h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] min-h-[640px] md:min-h-[720px] w-full">
      {/* Header section */}
      <section
        className="shrink-0 relative overflow-hidden rounded-[30px] p-5 md:p-7 animate-fade-in-up"
        style={{
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'blur(24px) saturate(1.35)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.35)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow-lg)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 12% 18%, rgba(59,107,74,0.14), transparent 28%),
              radial-gradient(circle at 88% 22%, rgba(139,109,46,0.12), transparent 24%),
              linear-gradient(135deg, rgba(59,107,74,0.08), transparent 55%)
            `,
          }}
        />
        <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ background: 'rgba(59,107,74,0.08)', color: 'var(--color-primary-base)', border: '1px solid rgba(59,107,74,0.12)' }}>
              <Radio className="h-3.5 w-3.5" />
              Live monitoring
            </div>
            <h1 className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-2xl shrink-0" style={{ background: 'rgba(59,107,74,0.1)', color: 'var(--color-primary-base)' }}>
                <ShieldAlert className="h-5 w-5 md:h-6 md:w-6" />
              </span>
              <span className="text-3xl md:text-5xl font-serif tracking-tight text-gradient-earth">Community Sentinel</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-on-surface-variant">
              Track live safety signals around your community with a premium situational view for organizers, volunteers, and rapid-response teams.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <Waves className="h-3.5 w-3.5" style={{ color: 'var(--color-warm-amber)' }} />
                Hazard overlays
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <TriangleAlert className="h-3.5 w-3.5" style={{ color: 'var(--color-terracotta)' }} />
                Field-ready alerts
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {[
              { label: 'Active Alerts', value: loading ? '...' : metrics.total.toString(), tone: 'rgba(59,107,74,0.12)', color: 'var(--color-primary-base)' },
              { label: 'Critical Signals', value: loading ? '...' : metrics.critical.toString(), tone: 'rgba(194,113,91,0.12)', color: 'var(--color-terracotta)' },
              { label: 'Weather Events', value: loading ? '...' : metrics.weather.toString(), tone: 'rgba(212,168,82,0.12)', color: 'var(--color-warm-amber)' },
              { label: 'Latest Refresh', value: metrics.latestUpdate, tone: 'rgba(255,255,255,0.55)', color: 'var(--color-on-surface-base)' },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-[22px] p-4"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--glass-shadow)',
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{metric.label}</p>
                <p className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: metric.color }}>{metric.value}</p>
                <div className="mt-3 h-1.5 rounded-full" style={{ background: metric.tone }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-fade-in-up delay-100">
        <div
          className="flex p-1 rounded-full w-full max-w-xs"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 2px 8px rgba(42,45,43,0.04)',
          }}
        >
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-full transition-all duration-300 ${
              activeTab === 'map'
                ? 'text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            style={activeTab === 'map' ? {
              background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
              boxShadow: '0 2px 8px rgba(59,107,74,0.25)',
            } : undefined}
          >
            <MapIcon className="h-4 w-4" /> Safety Map
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-full transition-all duration-300 ${
              activeTab === 'feed'
                ? 'text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            style={activeTab === 'feed' ? {
              background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
              boxShadow: '0 2px 8px rgba(59,107,74,0.25)',
            } : undefined}
          >
            <Activity className="h-4 w-4" /> Alert Feed
          </button>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={fetchAlerts}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors" 
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--color-primary-base)' }} />
            {loading ? 'Syncing...' : 'Sync Now'}
          </button>
          <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <ShieldAlert className="h-3.5 w-3.5" style={{ color: 'var(--color-warm-amber)' }} />
            Route-aware monitoring
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div
        className="flex-1 overflow-hidden flex flex-col relative min-h-[500px] md:min-h-0 rounded-[30px] p-3 md:p-4 animate-fade-in-up delay-200"
        style={{
          background: 'var(--glass-bg-strong)',
          backdropFilter: 'blur(22px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow-lg)',
        }}
      >
        {activeTab === 'map' && (
          <div className="flex-1 rounded-[24px] overflow-hidden z-0 shadow-inner h-full w-full relative" style={{ background: 'var(--color-surface-dim-base)', border: '1px solid var(--glass-border)' }}>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-center justify-between p-4">
              <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">National view</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">Pan and zoom through active sentinel zones</p>
              </div>
              <div className="hidden md:flex rounded-2xl px-4 py-3 text-sm font-semibold text-on-surface" style={{ background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                {loading ? 'Syncing live layers...' : `${metrics.total} alerts on map`}
              </div>
            </div>
            <MapContainer
                center={[39.8283, -98.5795]} 
                zoom={4} 
                style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={tileUrl}
              />
              <SentinelMapOverlay alerts={alerts} />
            </MapContainer>
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="h-full overflow-hidden rounded-[24px] bg-transparent">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center rounded-[24px]" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                <Loader2 className="h-8 w-8 animate-spin mb-4" style={{ color: 'var(--color-primary-base)' }} />
                <p className="text-on-surface-variant font-medium text-sm">Synchronizing data streams...</p>
              </div>
            ) : (
              <SentinelAlertFeed alerts={alerts} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
