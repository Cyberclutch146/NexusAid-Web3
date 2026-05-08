import { NextResponse } from 'next/server';
import { getAllSentinelAlerts } from '@/services/sentinelService';

export const revalidate = 300; // Cache for 5 minutes at the route level

export async function GET() {
  try {
    const alerts = await getAllSentinelAlerts();
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Sentinel API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Sentinel data' }, { status: 500 });
  }
}
