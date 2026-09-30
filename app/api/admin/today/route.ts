import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { getAdminTodayItems } from '@/lib/adminTodayCounts';

export async function GET(request: NextRequest) {
  const session = getAdminSession(request);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await getAdminTodayItems(session.role, session.permissions);
    const waiting = items.reduce((sum, item) => sum + item.count, 0);
    return NextResponse.json({ success: true, waiting, items });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load today strip' }, { status: 500 });
  }
}
