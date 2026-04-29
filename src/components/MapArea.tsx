'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CommunityEvent } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SentinelMapOverlay from './SentinelMapOverlay';
import { SentinelAlert } from '@/types/sentinel';

// Custom elegant marker for our brand
const customMarkerHtml = `
  <div style="
    background-color: #1f3d2b;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>
`;

const ElegantIcon = L.divIcon({
  html: customMarkerHtml,
  className: 'custom-leaflet-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10]
});

interface MapAreaProps {
  events: CommunityEvent[];
  alerts?: SentinelAlert[];
  center?: [number, number];
  zoom?: number;
}

export default function MapArea({ events, alerts = [], center = [37.7749, -122.4194], zoom = 11 }: MapAreaProps) {
  const router = useRouter();

  // Filter events that actually have lat/lng
  const plottableEvents = events.filter(e => e.lat !== undefined && e.lng !== undefined);

  return (
    <div className="h-full w-full relative z-0 rounded-2xl overflow-hidden border border-black/5 shadow-sm">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {plottableEvents.map(event => (
          <Marker 
            key={event.id} 
            position={[event.lat!, event.lng!]}
            icon={ElegantIcon}
          >
            <Popup>
              <div className="p-1 min-w-[200px]">
                <h3 className="font-serif font-bold text-base mb-1">{event.title}</h3>
                <p className="text-xs text-gray-600 mb-2">{event.location}</p>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs bg-[#1f3d2b]/10 text-[#1f3d2b] px-2 py-0.5 rounded-full">
                    {event.category}
                  </span>
                  {event.urgency === 'high' && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">
                      Critical
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => router.push(`/event/${event.id}`)}
                  className="w-full bg-[#1f3d2b] text-white py-1.5 rounded text-sm hover:opacity-90 transition-opacity"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {alerts.length > 0 && <SentinelMapOverlay alerts={alerts} />}
      </MapContainer>
    </div>
  );
}
