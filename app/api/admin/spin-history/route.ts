import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getAdminSpinHistory, type SpinHistoryStatus } from '@/lib/spinWheelHistory';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = request.nextUrl.searchParams;
    const q = params.get('q') ?? '';
    const status = (params.get('status') ?? 'all') as SpinHistoryStatus | 'all';
    const limit = Number(params.get('limit') || 200);
    const reconcile = params.get('reconcile') === '1';

    const result = await getAdminSpinHistory({ q, status, limit, reconcile });

    return NextResponse.json({
      success: true,
      entries: result.entries,
      stats: result.stats,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load spin history' }, { status: 500 });
  }
}