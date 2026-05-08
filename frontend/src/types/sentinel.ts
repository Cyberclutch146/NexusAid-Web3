export type SentinelAlertType = 'WEATHER' | 'SEISMIC' | 'SOCIAL' | 'NEWS';

export type SentinelSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';

export interface SentinelCoordinates {
  lat: number;
  lng: number;
}

export interface SentinelAlert {
  id: string;
  source: string; // e.g., "NOAA", "USGS", "Reddit"
  type: SentinelAlertType;
  severity: SentinelSeverity;
  title: string;
  description: string;
  url?: string;
  timestamp: string; // ISO string
  locationName: string;
  coordinates?: SentinelCoordinates; // Single point
  polygon?: SentinelCoordinates[]; // Area/polygon for weather warnings
}
