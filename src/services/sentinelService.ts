import { SentinelAlert, SentinelSeverity, SentinelCoordinates, SentinelAlertType } from '@/types/sentinel';
import Parser from 'rss-parser';

// Helper to determine NOAA severity
function mapNoaaSeverity(severity: string): SentinelSeverity {
  switch (severity?.toLowerCase()) {
    case 'extreme': return 'Extreme';
    case 'severe': return 'Severe';
    case 'moderate': return 'Moderate';
    case 'minor': return 'Minor';
    default: return 'Unknown';
  }
}

// Fetch NOAA Active Weather Alerts
export async function fetchNoaaAlerts(): Promise<SentinelAlert[]> {
  try {
    const res = await fetch('https://api.weather.gov/alerts/active?severity=Severe,Extreme', {
      headers: {
        'User-Agent': 'CommunityManagementApp/1.0 (contact@example.com)',
        'Accept': 'application/geo+json'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!res.ok) {
      console.error('NOAA API returned status:', res.status);
      return [];
    }

    const data = await res.json();
    const alerts: SentinelAlert[] = [];

    if (data.features && Array.isArray(data.features)) {
      for (const feature of data.features) {
        const props = feature.properties;
        let polygon: SentinelCoordinates[] | undefined;

        // Try to parse geometry polygon if present
        if (feature.geometry && feature.geometry.type === 'Polygon') {
           const coords = feature.geometry.coordinates[0]; // array of [lng, lat]
           if (Array.isArray(coords)) {
             polygon = coords.map((c: number[]) => ({ lng: c[0], lat: c[1] }));
           }
        } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
            const coords = feature.geometry.coordinates[0][0]; // Take first polygon's outer ring
            if (Array.isArray(coords)) {
                polygon = coords.map((c: number[]) => ({ lng: c[0], lat: c[1] }));
            }
        }

        alerts.push({
          id: props.id,
          source: 'NOAA Weather',
          type: 'WEATHER',
          severity: mapNoaaSeverity(props.severity),
          title: props.event,
          description: props.headline || props.description || 'No description provided.',
          timestamp: props.sent || new Date().toISOString(),
          locationName: props.areaDesc,
          polygon
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching NOAA alerts:', error);
    return [];
  }
}

// Helper to map USGS Magnitude to Severity
function mapUsgsSeverity(mag: number): SentinelSeverity {
  if (mag >= 7.0) return 'Extreme';
  if (mag >= 5.5) return 'Severe';
  if (mag >= 4.0) return 'Moderate';
  if (mag >= 2.5) return 'Minor';
  return 'Unknown';
}

// Fetch USGS Earthquake Data (M2.5+ past day)
export async function fetchUsgsEarthquakes(): Promise<SentinelAlert[]> {
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', {
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!res.ok) {
      console.error('USGS API returned status:', res.status);
      return [];
    }

    const data = await res.json();
    const alerts: SentinelAlert[] = [];

    if (data.features && Array.isArray(data.features)) {
      for (const feature of data.features) {
        const props = feature.properties;
        const geom = feature.geometry;
        
        let coordinates: SentinelCoordinates | undefined;
        if (geom && geom.type === 'Point') {
          // USGS format is [longitude, latitude, depth]
          coordinates = {
            lng: geom.coordinates[0],
            lat: geom.coordinates[1]
          };
        }

        alerts.push({
          id: feature.id,
          source: 'USGS Earthquakes',
          type: 'SEISMIC',
          severity: mapUsgsSeverity(props.mag),
          title: `M ${props.mag} - ${props.place}`,
          description: `Earthquake of magnitude ${props.mag} occurred at ${new Date(props.time).toLocaleString()}`,
          url: props.url,
          timestamp: new Date(props.time).toISOString(),
          locationName: props.place,
          coordinates
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching USGS earthquakes:', error);
    return [];
  }
}

export async function fetchRedditSocialAlerts(query: string = 'emergency OR crisis OR disaster'): Promise<SentinelAlert[]> {
  try {
    const res = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=10`, {
       next: { revalidate: 300 }
    });

    if (!res.ok) {
       console.error('Reddit API returned status:', res.status);
       return [];
    }

    const data = await res.json();
    const alerts: SentinelAlert[] = [];

    if (data.data?.children && Array.isArray(data.data.children)) {
      for (const child of data.data.children) {
        const post = child.data;
        alerts.push({
          id: post.id,
          source: 'Reddit',
          type: 'SOCIAL',
          severity: 'Unknown', // Social severity is hard to gauge automatically
          title: post.title,
          description: post.selftext ? post.selftext.substring(0, 200) + (post.selftext.length > 200 ? '...' : '') : 'No description provided.',
          url: `https://reddit.com${post.permalink}`,
          timestamp: new Date(post.created_utc * 1000).toISOString(),
          locationName: post.subreddit_name_prefixed,
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching Reddit alerts:', error);
    return [];
  }
}


export async function fetchGdacsAlerts(): Promise<SentinelAlert[]> {
  try {
    // GDACS provides real-time alerts for Earthquakes, Tropical Cyclones, Floods, Volcanoes
    const res = await fetch('https://www.gdacs.org/xml/rss.geojson', {
      next: { revalidate: 300 }
    });

    if (!res.ok) {
      console.error('GDACS API returned status:', res.status);
      return [];
    }

    const data = await res.json();
    const alerts: SentinelAlert[] = [];

    if (data.features && Array.isArray(data.features)) {
      for (const feature of data.features) {
        const props = feature.properties;
        const geom = feature.geometry;
        
        let coordinates: SentinelCoordinates | undefined;
        if (geom && geom.type === 'Point') {
          coordinates = {
            lng: geom.coordinates[0],
            lat: geom.coordinates[1]
          };
        }

        // Map GDACS alertlevel (Green, Orange, Red) to SentinelSeverity
        let severity: SentinelSeverity = 'Unknown';
        if (props.alertlevel === 'Red') severity = 'Extreme';
        else if (props.alertlevel === 'Orange') severity = 'Severe';
        else if (props.alertlevel === 'Green') severity = 'Minor';

        // GDACS event types: EQ (Earthquake), TC (Tropical Cyclone), FL (Flood), VO (Volcano)
        const typeStr = props.eventtype || '';
        let type: typeof alerts[0]['type'] = 'WEATHER';
        if (typeStr === 'EQ' || typeStr === 'VO') type = 'SEISMIC';

        alerts.push({
          id: `gdacs-${feature.id || props.eventid}`,
          source: 'GDACS',
          type,
          severity,
          title: props.name || `${props.eventtype} Event`,
          description: props.description || `Alert level: ${props.alertlevel}`,
          url: props.url?.report || `https://www.gdacs.org/`,
          timestamp: props.fromdate || new Date().toISOString(),
          locationName: props.country || 'Global',
          coordinates
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching GDACS alerts:', error);
    return [];
  }
}

export async function fetchReliefWebNews(): Promise<SentinelAlert[]> {
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://reliefweb.int/updates/rss.xml');
    
    const alerts: SentinelAlert[] = [];
    
    if (feed.items && Array.isArray(feed.items)) {
      // Limit to latest 10 items
      for (const item of feed.items.slice(0, 10)) {
        alerts.push({
          id: `reliefweb-${item.guid || Math.random().toString(36).substring(7)}`,
          source: 'ReliefWeb News',
          type: 'NEWS',
          severity: 'Unknown',
          title: item.title || 'Humanitarian Update',
          description: item.contentSnippet?.substring(0, 200) || item.content?.substring(0, 200) || 'Latest humanitarian situation report available via ReliefWeb.',
          url: item.link || `https://reliefweb.int/`,
          timestamp: item.isoDate || new Date().toISOString(),
          locationName: 'Global',
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching ReliefWeb news:', error);
    return [];
  }
}

export async function fetchNasaEonetAlerts(): Promise<SentinelAlert[]> {
  try {
    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?limit=15', {
      next: { revalidate: 300 }
    });

    if (!res.ok) {
      console.error('NASA EONET API returned status:', res.status);
      return [];
    }

    const data = await res.json();
    const alerts: SentinelAlert[] = [];

    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
        let type: SentinelAlertType = 'WEATHER';
        let severity: SentinelSeverity = 'Moderate';

        const catId = event.categories?.[0]?.id;
        if (catId === 'volcanoes' || catId === 'earthquakes') {
          type = 'SEISMIC';
          severity = 'Severe';
        } else if (catId === 'wildfires') {
          type = 'WEATHER';
          severity = 'Severe';
        }

        let coordinates: SentinelCoordinates | undefined;
        const geometries = event.geometry;
        if (geometries && Array.isArray(geometries) && geometries.length > 0) {
           const latestGeom = geometries[geometries.length - 1];
           if (latestGeom.type === 'Point') {
             coordinates = {
               lng: latestGeom.coordinates[0],
               lat: latestGeom.coordinates[1]
             };
           }
        }

        alerts.push({
          id: event.id,
          source: 'NASA EONET',
          type,
          severity,
          title: event.title,
          description: event.description || `Active event tracked by NASA. Category: ${event.categories?.[0]?.title || 'Unknown'}.`,
          url: event.link || event.sources?.[0]?.url,
          timestamp: geometries?.[geometries.length - 1]?.date || new Date().toISOString(),
          locationName: 'Global Event',
          coordinates
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching NASA EONET alerts:', error);
    return [];
  }
}

// Common Indian locations for news geocoding fallback
const INDIAN_CITY_COORDS: Record<string, SentinelCoordinates> = {
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Delhi': { lat: 28.6139, lng: 77.2090 },
  'Bengaluru': { lat: 12.9716, lng: 77.5946 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Odisha': { lat: 20.9517, lng: 85.0985 },
  'Assam': { lat: 26.2006, lng: 92.9376 },
  'Gujarat': { lat: 22.2587, lng: 71.1924 },
  'Kerala': { lat: 10.8505, lng: 76.2711 },
  'Cuttack': { lat: 20.4625, lng: 85.8830 },
  'Ganjam': { lat: 19.3870, lng: 84.8870 },
  'Andhra Pradesh': { lat: 15.9129, lng: 79.7400 },
  'Bihar': { lat: 25.0961, lng: 85.3131 },
  'Rajasthan': { lat: 27.0238, lng: 74.2179 },
  'West Bengal': { lat: 22.9868, lng: 87.8550 },
};

export async function fetchSachetAlerts(): Promise<SentinelAlert[]> {
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml');
    
    if (!feed.items || !Array.isArray(feed.items)) return [];

    // Map creator to source and pre-process alerts
    const baseAlerts = feed.items.map(item => {
      let severity: SentinelSeverity = 'Moderate';
      const titleLower = item.title?.toLowerCase() || '';
      
      if (titleLower.includes('extreme') || titleLower.includes('severe')) severity = 'Extreme';
      else if (titleLower.includes('moderate')) severity = 'Moderate';
      else if (titleLower.includes('low')) severity = 'Minor';

      const sourceName = item.creator ? `SACHET (${item.creator.replace(/.*?\((.*?)\).*/, '$1')})` : 'SACHET India';

      return {
        id: `sachet-${item.guid || Math.random().toString(36).substring(7)}`,
        source: sourceName,
        type: 'WEATHER' as SentinelAlertType,
        severity,
        title: item.title || 'Official Alert',
        description: item.contentSnippet || item.title || 'Active alert from NDMA Sachet portal.',
        url: item.link || 'https://sachet.ndma.gov.in/',
        timestamp: item.isoDate || new Date().toISOString(),
        locationName: 'India',
        identifier: item.guid
      };
    });

    // Fetch details and polygons for the latest 8 alerts in parallel
    const enrichedAlerts = await Promise.all(baseAlerts.slice(0, 8).map(async (alert) => {
      try {
        const [polyRes, xmlRes] = await Promise.all([
          fetch(`https://sachet.ndma.gov.in/cap_public_website/FetchPolygonXMLFile?identifier=${alert.identifier}`, {
            next: { revalidate: 3600 }
          }).catch(() => null),
          fetch(`https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=${alert.identifier}`, {
            next: { revalidate: 3600 }
          }).catch(() => null)
        ]);
        
        let polygon: SentinelCoordinates[] | undefined = undefined;
        let coordinates: SentinelCoordinates | undefined = undefined;
        let enTitle = alert.title;
        let enDesc = alert.description;

        if (polyRes && polyRes.ok) {
          const polyXml = await polyRes.text();
          // Simple regex to extract <polygon> contents: lat,lng lat,lng ...
          const matches = polyXml.match(/<polygon>(.*?)<\/polygon>/g);
          if (matches && matches.length > 0) {
            // Take the first polygon for simplicity
            const pointsStr = matches[0].replace(/<\/?polygon>/g, '').trim();
            const points = pointsStr.split(/\s+/).map(p => {
              const [lat, lng] = p.split(',').map(Number);
              return { lat, lng };
            });
            
            if (points.length > 0) {
              polygon = points;
              coordinates = points[0]; // Use first point as center pin
            }
          }
        }

        if (xmlRes && xmlRes.ok) {
          const fullXml = await xmlRes.text();
          
          // Split by <cap:info> blocks
          const infoBlocks = fullXml.split('<cap:info>');
          for (const block of infoBlocks) {
            if (block.includes('<cap:language>en-IN</cap:language>')) {
              const headlineMatch = block.match(/<cap:headline>([\s\S]*?)<\/cap:headline>/);
              const descMatch = block.match(/<cap:description>([\s\S]*?)<\/cap:description>/);
              
              if (headlineMatch && headlineMatch[1]) {
                enTitle = headlineMatch[1].trim();
                enDesc = enTitle; // Use headline as desc if description is missing
              }
              if (descMatch && descMatch[1] && descMatch[1].trim() !== '') {
                enDesc = descMatch[1].trim();
              }
              break; // Found English block, stop searching
            }
          }
        }

        return {
          ...alert,
          title: enTitle,
          description: enDesc,
          polygon,
          coordinates
        };
      } catch (e) {
        console.error(`Error enriching alert ${alert.id}:`, e);
      }
      return alert;
    }));

    // Combine enriched alerts with the rest
    return [...enrichedAlerts, ...baseAlerts.slice(8)];
  } catch (error) {
    console.error('Error fetching SACHET alerts:', error);
    return [];
  }
}

export async function fetchIndiaNews(): Promise<SentinelAlert[]> {
  try {
    const parser = new Parser();
    const query = encodeURIComponent('disaster OR flood OR cyclone OR earthquake India');
    const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`);
    
    const alerts: SentinelAlert[] = [];
    
    if (feed.items && Array.isArray(feed.items)) {
      for (const item of feed.items.slice(0, 8)) {
        let coordinates: SentinelCoordinates | undefined;
        let locationName = 'India';

        // Try to find a specific location in the title for a pin
        for (const city in INDIAN_CITY_COORDS) {
          if (item.title?.includes(city)) {
            coordinates = INDIAN_CITY_COORDS[city];
            locationName = city;
            break;
          }
        }

        alerts.push({
          id: `in-news-${item.guid || Math.random().toString(36).substring(7)}`,
          source: 'India News',
          type: 'NEWS',
          severity: 'Unknown',
          title: item.title || 'India Situation Report',
          description: item.contentSnippet || 'Local disaster news update.',
          url: item.link || 'https://news.google.com/',
          timestamp: item.isoDate || new Date().toISOString(),
          locationName,
          coordinates
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching India news:', error);
    return [];
  }
}

export async function getAllSentinelAlerts(): Promise<SentinelAlert[]> {
  const results = await Promise.allSettled([
    fetchNoaaAlerts(),
    fetchUsgsEarthquakes(),
    fetchRedditSocialAlerts(),
    fetchGdacsAlerts(),
    fetchReliefWebNews(),
    fetchNasaEonetAlerts(),
    fetchSachetAlerts(),
    fetchIndiaNews()
  ]);

  const sourceNames = ['NOAA', 'USGS', 'Reddit', 'GDACS', 'ReliefWeb', 'NASA EONET', 'Sachet', 'India News'];

  // Collect successful results and log failures
  const allAlerts: SentinelAlert[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allAlerts.push(...result.value);
    } else {
      console.error(`Sentinel source "${sourceNames[index]}" failed:`, result.reason);
    }
  });

  // Sort by newest first
  allAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return allAlerts;
}
