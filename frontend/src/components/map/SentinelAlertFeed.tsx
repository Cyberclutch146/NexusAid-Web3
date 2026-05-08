'use client';

import { SentinelAlert } from '@/types/sentinel';
import { AlertTriangle, CloudRain, Activity, MessageCircle, ExternalLink, Filter, Newspaper } from 'lucide-react';
import { useState, useMemo } from 'react';

interface SentinelAlertFeedProps {
  alerts: SentinelAlert[];
}

export default function SentinelAlertFeed({ alerts }: SentinelAlertFeedProps) {
  const [filterType, setFilterType] = useState('ALL');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => filterType === 'ALL' || a.type === filterType);
  }, [alerts, filterType]);

  const paginatedAlerts = useMemo(() => {
    return filteredAlerts.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredAlerts, page]);

  const hasMore = paginatedAlerts.length < filteredAlerts.length;
  
  const getIcon = (type: string, severity: string) => {
    switch (type) {
      case 'WEATHER': return <CloudRain className={`h-4 w-4 ${severity === 'Extreme' ? 'text-red-600 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`} />;
      case 'SEISMIC': return <Activity className="h-4 w-4 text-red-500 dark:text-red-400" />;
      case 'SOCIAL': return <MessageCircle className="h-4 w-4 text-purple-500 dark:text-purple-400" />;
      case 'NEWS': return <Newspaper className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default: return <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Extreme': return <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/50 text-[9px] font-bold uppercase rounded-sm tracking-widest shadow-sm">Extreme</span>;
      case 'Severe': return <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50 text-[9px] font-bold uppercase rounded-sm tracking-widest shadow-sm">Severe</span>;
      case 'Moderate': return <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50 text-[9px] font-bold uppercase rounded-sm tracking-widest shadow-sm">Moderate</span>;
      case 'Minor': return <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 text-[9px] font-bold uppercase rounded-sm tracking-widest shadow-sm">Minor</span>;
      default: return <span className="px-2 py-0.5 bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-zinc-700/50 text-[9px] font-bold uppercase rounded-sm tracking-widest shadow-sm">Unknown</span>;
    }
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className="rounded-[24px] p-10 text-center text-on-surface-variant" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
        <Activity className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--color-outline-base)' }} />
        <p className="font-semibold text-on-surface text-sm">No active alerts detected.</p>
        <p className="text-xs mt-1">The community sentinel is monitoring data streams.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden flex flex-col h-full rounded-[24px]" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
      <div className="p-4 md:p-5 flex flex-col gap-4 border-b z-10 relative" style={{ borderColor: 'var(--glass-border)', background: 'linear-gradient(180deg, var(--glass-bg-strong), var(--glass-bg))' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface flex items-center gap-2 tracking-tight">
            <Activity className="h-5 w-5" style={{ color: 'var(--color-primary-base)' }} />
            Live Sentinel Feed
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">Curated field signals across weather, seismic, social, and regional news sources.</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider" style={{ color: 'var(--color-primary-base)', background: 'rgba(59,107,74,0.08)', border: '1px solid rgba(59,107,74,0.12)' }}>
            {filteredAlerts.length} Active
          </span>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="h-3 w-3 shrink-0 mr-1" style={{ color: 'var(--color-outline-base)' }} />
          {['ALL', 'WEATHER', 'SEISMIC', 'SOCIAL', 'NEWS'].map(type => (
             <button
               key={type}
               onClick={() => { setFilterType(type); setPage(1); }}
               className="shrink-0 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-full transition-all duration-300 border"
               style={filterType === type ? {
                 background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                 color: 'var(--color-on-primary-base)',
                 borderColor: 'transparent',
                 boxShadow: '0 2px 8px rgba(59,107,74,0.2)',
               } : {
                 background: 'var(--glass-bg-strong)',
                 color: 'var(--color-on-surface-variant-base)',
                 borderColor: 'var(--glass-border)',
               }}
             >
               {type}
             </button>
          ))}
        </div>
      </div>
      
      <div className="overflow-y-auto flex-1 p-3 md:p-4 space-y-3 bg-transparent">
        {paginatedAlerts.map((alert) => (
          <div
            key={alert.id}
            className="p-4 rounded-[22px] transition-all duration-300 group relative overflow-hidden hover:-translate-y-0.5"
            style={{
              background: 'var(--glass-bg-strong)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px opacity-70" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,107,74,0.22), transparent)' }} />
            <div className="flex justify-between items-start mb-2 gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl p-2 transition-colors duration-300" style={{ background: 'rgba(59,107,74,0.06)' }}>
                  {getIcon(alert.type, alert.severity)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">{alert.type}</span>
                    <span className="h-1 w-1 rounded-full bg-on-surface-variant/30" />
                    <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant font-medium">{alert.locationName}</p>
                  </div>
                  <h3 className="mt-1 font-semibold text-sm text-on-surface leading-tight group-hover:text-primary transition-colors">{alert.title}</h3>
                </div>
              </div>
              <div>
                {getSeverityBadge(alert.severity)}
              </div>
            </div>
            
            <p className="text-xs text-on-surface-variant mt-3 line-clamp-2 pl-[3.25rem] leading-relaxed group-hover:text-on-surface transition-colors">
              {alert.description}
            </p>
            
            <div className="flex items-center justify-between mt-4 pl-[3.25rem] border-t pt-3" style={{ borderColor: 'rgba(42,45,43,0.08)' }}>
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                {alert.source} • {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              
              {alert.url && (
                <a
                  href={alert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] flex items-center gap-1 font-semibold transition-colors px-2.5 py-1.5 rounded-full border"
                  style={{ color: 'var(--color-on-surface-variant-base)', background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
                >
                  Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
        
        {paginatedAlerts.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant text-xs font-medium">
             <Activity className="h-8 w-8 mx-auto mb-3 opacity-50" style={{ color: 'var(--color-outline-base)' }} />
             No active alerts match the selected filter.
          </div>
        )}

        {hasMore && (
          <div className="pt-2 pb-6 flex justify-center relative z-10">
            <button 
              onClick={() => setPage(p => p + 1)}
              className="font-semibold py-2.5 px-6 rounded-full transition-all duration-300 text-xs tracking-wide uppercase hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-base), var(--color-moss))',
                color: 'var(--color-on-primary-base)',
                boxShadow: '0 4px 14px rgba(59,107,74,0.22)',
              }}
            >
              Load More Alerts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
