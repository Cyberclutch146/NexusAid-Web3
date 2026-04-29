'use client';

import { Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { SentinelAlert } from '@/types/sentinel';
import { useMemo } from 'react';

// Icons
const WeatherIcon = L.divIcon({
  html: `<div style="background-color:#3b82f6;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,
  className: 'sentinel-weather-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const SeismicIcon = L.divIcon({
  html: `<div style="background-color:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,
  className: 'sentinel-seismic-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const SocialIcon = L.divIcon({
  html: `<div style="background-color:#8b5cf6;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,
  className: 'sentinel-social-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const NewsIcon = L.divIcon({
  html: `<div style="background-color:#f59e0b;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,
  className: 'sentinel-news-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

export default function SentinelMapOverlay({ alerts }: { alerts: SentinelAlert[] }) {
  
  // Weather alerts often have polygons.
  const weatherPolygons = useMemo(() => {
    return alerts.filter(a => a.type === 'WEATHER' && a.polygon && a.polygon.length > 0);
  }, [alerts]);

  // Points for seismic, social, or weather without polygons
  const pointAlerts = useMemo(() => {
    return alerts.filter(a => a.coordinates && (!a.polygon || a.polygon.length === 0));
  }, [alerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Extreme': return '#991b1b'; // Red-800
      case 'Severe': return '#dc2626';  // Red-600
      case 'Moderate': return '#f59e0b'; // Amber-500
      case 'Minor': return '#fcd34d';    // Amber-300
      default: return '#3b82f6';         // Blue-500
    }
  };

  const getIcon = (type: string) => {
     switch (type) {
       case 'WEATHER': return WeatherIcon;
       case 'SEISMIC': return SeismicIcon;
       case 'SOCIAL': return SocialIcon;
       case 'NEWS': return NewsIcon;
       default: return WeatherIcon;
     }
  };

  return (
    <>
      {/* Render Polygons */}
      {weatherPolygons.map(alert => (
        <Polygon 
          key={alert.id}
          positions={alert.polygon!.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: getSeverityColor(alert.severity),
            fillColor: getSeverityColor(alert.severity),
            fillOpacity: 0.3,
            weight: 2
          }}
        >
          <Popup>
            <div className="p-1 min-w-[200px]">
               <div className="flex items-center gap-2 mb-1">
                 <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{alert.source}</span>
                 <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${alert.severity === 'Extreme' || alert.severity === 'Severe' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'}`}>{alert.severity}</span>
               </div>
               <h3 className="font-bold text-sm mb-1 dark:text-zinc-100">{alert.title}</h3>
               <p className="text-xs text-gray-700 dark:text-zinc-400">{alert.locationName}</p>
            </div>
          </Popup>
        </Polygon>
      ))}

      {/* Render Points */}
      {pointAlerts.map(alert => (
        <Marker
          key={alert.id}
          position={[alert.coordinates!.lat, alert.coordinates!.lng]}
          icon={getIcon(alert.type)}
        >
          <Popup>
             <div className="p-1 min-w-[200px]">
               <div className="flex items-center gap-2 mb-1">
                 <span className="text-xs bg-gray-100 dark:bg-zinc-800/60 text-gray-800 dark:text-zinc-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{alert.source}</span>
                 <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${alert.severity === 'Extreme' || alert.severity === 'Severe' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' : alert.severity === 'Unknown' ? 'bg-gray-100 dark:bg-zinc-800/60 text-gray-800 dark:text-zinc-300' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'}`}>{alert.severity}</span>
               </div>
               <h3 className="font-bold text-sm mb-1 dark:text-zinc-100">{alert.title}</h3>
               {alert.url ? (
                 <a href={alert.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View Source</a>
               ) : (
                 <p className="text-xs text-gray-700 dark:text-zinc-400">{alert.locationName}</p>
               )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
