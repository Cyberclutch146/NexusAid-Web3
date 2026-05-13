'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { SentinelAlert } from '@/types/sentinel';

interface FitBoundsHelperProps {
  alerts: SentinelAlert[];
}

/**
 * Auto-fits the map view to encompass all alert locations.
 * Only adjusts bounds once when alerts first load (not on every re-render).
 */
export default function FitBoundsHelper({ alerts }: FitBoundsHelperProps) {
  const map = useMap();

  useEffect(() => {
    if (!alerts || alerts.length === 0) return;

    const points: L.LatLng[] = [];

    for (const alert of alerts) {
      if (alert.coordinates) {
        points.push(L.latLng(alert.coordinates.lat, alert.coordinates.lng));
      }
      if (alert.polygon && alert.polygon.length > 0) {
        // Use the centroid of the polygon
        const lats = alert.polygon.map(p => p.lat);
        const lngs = alert.polygon.map(p => p.lng);
        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        points.push(L.latLng(centerLat, centerLng));
      }
    }

    if (points.length === 0) return;

    try {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 8,
        animate: true,
        duration: 1.2,
      });
    } catch {
      // Ignore invalid bounds (e.g., all points at same location)
    }
  }, [alerts.length]); // Only refit when alert count changes

  return null;
}
