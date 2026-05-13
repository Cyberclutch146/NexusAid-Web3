import { NextResponse } from 'next/server';
import { getAllSentinelAlerts } from '@/services/sentinelService';
import { SentinelAlert } from '@/types/sentinel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SENTINEL_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

let cachedAlerts: SentinelAlert[] | null = null;
let cachedAt = 0;
let refreshPromise: Promise<SentinelAlert[]> | null = null;

async function refreshSentinelCache(): Promise<SentinelAlert[]> {
  if (!refreshPromise) {
    refreshPromise = getAllSentinelAlerts()
      .then((alerts) => {
        // Always update cache, even if empty (to avoid serving stale data indefinitely)
        cachedAlerts = alerts;
        cachedAt = Date.now();
        return alerts;
      })
      .catch((error) => {
        console.error('Sentinel cache refresh failed:', error);
        // Return stale cache if available
        return cachedAlerts || [];
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function GET() {
  try {
    const cacheAge = Date.now() - cachedAt;
    const shouldRefresh = !cachedAlerts || cacheAge >= SENTINEL_REFRESH_INTERVAL_MS;
    const alerts = shouldRefresh ? await refreshSentinelCache() : cachedAlerts;

    return NextResponse.json(alerts || [], {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Sentinel-Cache': shouldRefresh ? 'refreshed' : 'hit',
        'X-Sentinel-Cache-Time': cachedAt ? new Date(cachedAt).toISOString() : '',
        'X-Sentinel-Count': String((alerts || []).length),
      },
    });
  } catch (error) {
    console.error('Sentinel API Error:', error);

    if (cachedAlerts) {
      return NextResponse.json(cachedAlerts, {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Sentinel-Cache': 'stale',
          'X-Sentinel-Cache-Time': new Date(cachedAt).toISOString(),
          'X-Sentinel-Count': String(cachedAlerts.length),
        },
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch Sentinel data. All upstream sources are unreachable.' },
      { status: 502 }
    );
  }
}
