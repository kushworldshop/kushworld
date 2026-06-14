import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import {
  acceptSpinPrize,
  forfeitActiveSpinPrize,
  forfeitPendingSpinPrize,
  spinWheel,
} from '@/lib/spinWheel';

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'forfeit') {
      await forfeitPendingSpinPrize(userId);
      return NextResponse.json({ success: true, message: 'Prize forfeited. You can spin again.' });
    }

    if (body.action === 'forfeit-coupon') {
      await forfeitActiveSpinPrize(userId);
      return NextResponse.json({ success: true, message: 'Saved coupon removed.' });
    }

    if (body.action === 'accept') {
      const { prize, replacedPrevious } = await acceptSpinPrize(userId);
      const expiryLabel = new Date(prize.expiresAt!).toLocaleDateString();
      return NextResponse.json({
        success: true,
        message: replacedPrevious
          ? `New coupon saved (replaced your previous one). Expires ${expiryLabel}. You can keep spinning!`
          : `Coupon saved! Expires ${expiryLabel}. You can keep spinning!`,
        prize,
        replacedPrevious,
      });
    }

    const result = await spinWheel(userId);

    return NextResponse.json({
      success: true,
      segmentId: result.segment.id,
      segmentLabel: result.segment.label,
      prize: result.prize,
      instantBonusPoints: result.instantBonusPoints,
      pointsSpent: result.pointsSpent,
      remainingPoints: result.remainingPoints,
      message: result.message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Spin failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}