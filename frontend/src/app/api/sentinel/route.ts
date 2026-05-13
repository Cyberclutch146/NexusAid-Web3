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
    const isStale = !cachedAlerts || cacheAge >= SENTINEL_REFRESH_INTERVAL_MS;

    // ── Stale-While-Revalidate ──────────────────────────────────────────────
    // If we have cached data (even stale), return it immediately and kick off
    // a background refresh. Only wait on the very first request (no cache yet).
    if (isStale && cachedAlerts) {
      // Fire-and-forget — do not await
      refreshSentinelCache();
      return NextResponse.json(cachedAlerts, {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Sentinel-Cache': 'stale-while-revalidate',
          'X-Sentinel-Cache-Time': new Date(cachedAt).toISOString(),
        },
      });
    }

    // First-ever request (no cache) — must wait for real data
    const alerts = isStale ? await refreshSentinelCache() : cachedAlerts;

    return NextResponse.json(alerts || [], {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Sentinel-Cache': isStale ? 'refreshed' : 'hit',
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
