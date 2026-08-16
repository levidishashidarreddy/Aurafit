import { NextRequest, NextResponse } from 'next/server';
import { fetchGoogleFitMetrics, getSimulatedHealthData } from '@/lib/services/googleFitService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const simulate = searchParams.get('simulate') === 'true';
  const queryToken = searchParams.get('token');

  // Read token from query or HTTP cookie
  const cookieToken = request.cookies.get('google_fit_token')?.value;
  const token = queryToken || cookieToken;

  if (simulate) {
    const data = getSimulatedHealthData();
    return NextResponse.json({ success: true, metrics: data });
  }

  if (!token) {
    // Return 200 with isSynced=false to avoid noisy browser 401 network errors
    return NextResponse.json({
      success: false,
      isSynced: false,
      error: 'Google Fit token not connected',
      metrics: getSimulatedHealthData(7800),
    });
  }

  try {
    const metrics = await fetchGoogleFitMetrics(token);
    return NextResponse.json({ success: true, metrics });
  } catch (err: any) {
    console.warn('Google Fit fetch error, falling back to cached simulated metrics:', err?.message);
    return NextResponse.json({
      success: false,
      isSynced: false,
      error: err.message || 'Failed to sync with Google Fit',
      metrics: getSimulatedHealthData(7800),
    });
  }
}
