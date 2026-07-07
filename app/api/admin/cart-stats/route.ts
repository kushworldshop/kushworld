import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getActiveCarts } from '@/lib/cartStats';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 100);
    const stats = await getActiveCarts(limit);
    return NextResponse.json({ success: true, ...stats });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load cart stats' }, { status: 500 });
  }
}