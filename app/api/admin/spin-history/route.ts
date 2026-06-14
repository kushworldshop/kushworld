import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import {
  extendSpinHistoryExpiry,
  getAdminSpinHistory,
  type SpinHistoryStatus,
} from '@/lib/spinWheelHistory';
import { extendUserSpinPrizeExpiry, readUsers } from '@/lib/users';
import { PRIZE_EXPIRY_DAYS } from '@/lib/spinWheelTypes';

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

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const prizeId = String(body.prizeId || '').trim();
    const extendDays = Number(body.extendDays ?? PRIZE_EXPIRY_DAYS);

    if (!prizeId) {
      return NextResponse.json({ success: false, error: 'prizeId required' }, { status: 400 });
    }
    if (!Number.isFinite(extendDays) || extendDays <= 0 || extendDays > 365) {
      return NextResponse.json({ success: false, error: 'extendDays must be between 1 and 365' }, { status: 400 });
    }

    const users = await readUsers();
    const owner = users.find((user) => user.activeSpinPrize?.id === prizeId);
    if (!owner?.activeSpinPrize?.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Active coupon not found for this prize' },
        { status: 404 }
      );
    }

    const currentExpiry = new Date(owner.activeSpinPrize.expiresAt);
    const base = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
    const nextExpiry = new Date(base);
    nextExpiry.setDate(nextExpiry.getDate() + extendDays);
    const expiresAt = nextExpiry.toISOString();

    const updatedUser = await extendUserSpinPrizeExpiry(owner.id, prizeId, expiresAt);
    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'Failed to update member coupon' }, { status: 500 });
    }

    await extendSpinHistoryExpiry(prizeId, expiresAt);

    return NextResponse.json({
      success: true,
      prizeId,
      expiresAt,
      message: `Extended ${extendDays} day${extendDays === 1 ? '' : 's'} — now expires ${nextExpiry.toLocaleDateString()}`,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to extend coupon' }, { status: 500 });
  }
}