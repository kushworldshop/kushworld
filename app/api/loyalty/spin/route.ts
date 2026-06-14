import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { acceptSpinPrize, forfeitSpinPrize, spinWheel } from '@/lib/spinWheel';

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'forfeit') {
      await forfeitSpinPrize(userId);
      return NextResponse.json({ success: true, message: 'Prize forfeited. You can spin again.' });
    }

    if (body.action === 'accept') {
      const prize = await acceptSpinPrize(userId);
      return NextResponse.json({
        success: true,
        message: `Coupon saved! Use it within 7 days (expires ${new Date(prize.expiresAt!).toLocaleDateString()}).`,
        prize,
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