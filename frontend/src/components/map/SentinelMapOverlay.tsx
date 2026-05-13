'use client';

import { Marker, Popup, Polygon, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { SentinelAlert } from '@/types/sentinel';
import { useMemo } from 'react';

// Severity-aware marker icons with size variation
function createIcon(color: string, size: number = 14, pulse: boolean = false) {
  const pulseStyle = pulse
    ? `animation: sentinel-pulse 2s ease-in-out infinite;`
    : '';
  
  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
      ">
        ${pulse ? `<div style="
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.3;
          ${pulseStyle}
        "></div>` : ''}
        <div style="
          position: relative;
          background-color: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 6px rgba(0,0,0,0.4);
        "></div>
      </div>
    `,
    className: 'sentinel-marker',
    iconSize: [size + (pulse ? 8 : 0), size + (pulse ? 8 : 0)],
    iconAnchor: [(size + (pulse ? 8 : 0)) / 2, (size + (pulse ? 8 : 0)) / 2],
  });
}

// Color palette
const COLORS = {
  weather: '#3b82f6',
  seismic: '#ef4444',
  social: '#8b5cf6',
  news: '#f59e0b',
  extreme: '#991b1b',
  severe: '#dc2626',
  moderate: '#f59e0b',
  minor: '#22c55e',
  unknown: '#6b7280',
};

export default function SentinelMapOverlay({ alerts }: { alerts: SentinelAlert[] }) {
  
  // Weather alerts often have polygons.
  const weatherPolygons = useMemo(() => {
    return alerts.filter(a => a.polygon && a.polygon.length > 0);
  }, [alerts]);

  // Points for seismic, social, or weather without polygons
  const pointAlerts = useMemo(() => {
    return alerts.filter(a => a.coordinates && (!a.polygon || a.polygon.length === 0));
  }, [alerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Extreme': return COLORS.extreme;
      case 'Severe': return COLORS.severe;
      case 'Moderate': return COLORS.moderate;
      case 'Minor': return COLORS.minor;
      default: return COLORS.unknown;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'WEATHER': return COLORS.weather;
      case 'SEISMIC': return COLORS.seismic;
      case 'SOCIAL': return COLORS.social;
      case 'NEWS': return COLORS.news;
      default: return COLORS.weather;
    }
  };

  const getMarkerIcon = (alert: SentinelAlert) => {
    const isCritical = alert.severity === 'Extreme' || alert.severity === 'Severe';
    const color = getTypeColor(alert.type);
    const size = isCritical ? 18 : 14;
    return createIcon(color, size, isCritical);
  };

  const formatTime = (timestamp: string) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <>
      {/* Inject pulse animation CSS */}
      <style>{`
        @keyframes sentinel-pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>

      {/* Render Polygons */}
      {weatherPolygons.map(alert => (
        <Polygon 
          key={alert.id}
          positions={alert.polygon!.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: getSeverityColor(alert.severity),
            fillColor: getSeverityColor(alert.severity),
            fillOpacity: 0.2,
            weight: 2,
            dashArray: alert.severity === 'Minor' ? '4 4' : undefined,
          }}
        >
          <Popup>
            <div className="p-2 min-w-[220px]">
               <div className="flex items-center gap-2 mb-2">
                 <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{alert.source}</span>
                 <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${alert.severity === 'Extreme' || alert.severity === 'Severe' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'}`}>{alert.severity}</span>
               </div>
               <h3 className="font-bold text-sm mb-1 dark:text-zinc-100">{alert.title}</h3>
               <p className="text-xs text-gray-600 dark:text-zinc-400 mb-2">{alert.locationName}</p>
               <p className="text-[10px] text-gray-500 dark:text-zinc-500">{formatTime(alert.timestamp)}</p>
               {alert.url && (
                 <a href={alert.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block">View Source →</a>
               )}
            </div>
          </Popup>
        </Polygon>
      ))}

      {/* Render Points */}
      {pointAlerts.map(alert => (
        <Marker
          key={alert.id}
          position={[alert.coordinates!.lat, alert.coordinates!.lng]}
          icon={getMarkerIcon(alert)}
        >
          <Popup>
             <div className="p-2 min-w-[220px]">
               <div className="flex items-center gap-2 mb-2">
                 <span className="text-[10px] bg-gray-100 dark:bg-zinc-800/60 text-gray-800 dark:text-zinc-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{alert.source}</span>
                 <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${alert.severity === 'Extreme' || alert.severity === 'Severe' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' : alert.severity === 'Unknown' ? 'bg-gray-100 dark:bg-zinc-800/60 text-gray-800 dark:text-zinc-300' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'}`}>{alert.severity}</span>
               </div>
               <h3 className="font-bold text-sm mb-1 dark:text-zinc-100">{alert.title}</h3>
               <p className="text-xs text-gray-600 dark:text-zinc-400 mb-2 line-clamp-2">{alert.description}</p>
               <p className="text-[10px] text-gray-500 dark:text-zinc-500">{formatTime(alert.timestamp)}</p>
               {alert.url && (
                 <a href={alert.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block">View Source →</a>
               )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
