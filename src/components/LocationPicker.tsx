'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toast } from 'sonner';

// Custom marker icon
const customMarkerHtml = `
  <div style="
    background-color: #1f3d2b;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 3px 6px rgba(0,0,0,0.3);
  "></div>
`;

const ElegantIcon = L.divIcon({
  html: customMarkerHtml,
  className: 'custom-leaflet-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface LocationPickerProps {
  onLocationSelect: (location: { name: string; lat: number; lng: number }) => void;
  initialLocation?: { lat: number; lng: number };
}

function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'CommunityManagementApp/1.0',
          },
        }
      );
      const data = await response.json();
      const name = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      onLocationSelect({ name, lat, lng });
      setSearchQuery(name);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      onLocationSelect({ name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
    }
  }, [onLocationSelect]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`,
        {
          headers: {
            'User-Agent': 'CommunityManagementApp/1.0',
          },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPos);
        onLocationSelect({ name: display_name, lat: newPos[0], lng: newPos[1] });
      } else {
        toast.error('Location not found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location');
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    reverseGeocode(lat, lng);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-surface-container-low border border-outline-variant/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-on-surface"
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e as any)}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-secondary text-on-secondary px-4 py-3 rounded-xl font-medium hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSearching ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">search</span>
            )}
            Search
          </button>
        </div>
      </div>

      <div className="h-[300px] w-full rounded-2xl overflow-hidden border border-outline-variant/30 shadow-inner relative z-0">
        <MapContainer
          center={position || [37.7749, -122.4194]}
          zoom={position ? 15 : 12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapEvents onMapClick={handleMapClick} />
          {position && (
            <>
              <Marker position={position} icon={ElegantIcon} />
              <ChangeView center={position} />
            </>
          )}
        </MapContainer>
        <div className="absolute bottom-2 left-2 z-[400] bg-surface-container/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-on-surface-variant pointer-events-none">
          Click on map to pick location
        </div>
      </div>
    </div>
  );
}
