import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import {
  acceptSpinPrize,
  forfeitPendingSpinPrize,
  forfeitSavedSpinCoupon,
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
      const prizeId = String(body.prizeId || '').trim();
      if (!prizeId) {
        return NextResponse.json({ success: false, error: 'prizeId required' }, { status: 400 });
      }
      await forfeitSavedSpinCoupon(userId, prizeId);
      return NextResponse.json({ success: true, message: 'Saved coupon removed.' });
    }

    if (body.action === 'accept') {
      const result = await acceptSpinPrize(userId);

      if (result.keptExistingBetter) {
        const kept = result.savedCoupons.find((coupon) => coupon.type.startsWith('percent_off'));
        return NextResponse.json({
          success: true,
          message: kept
            ? `You already have a better coupon (${kept.label}) — kept that one. You can keep spinning!`
            : 'You already have a better coupon — kept your existing one. You can keep spinning!',
          savedCoupons: result.savedCoupons,
          keptExistingBetter: true,
        });
      }

      const prize = result.acceptedPrize!;
      const expiryLabel = new Date(prize.expiresAt!).toLocaleDateString();
      const slotLabel =
        prize.type === 'free_shipping'
          ? 'free shipping coupon'
          : prize.type.startsWith('percent_off')
            ? '% off coupon'
            : 'coupon';

      return NextResponse.json({
        success: true,
        message: result.replacedPrevious
          ? `Updated your ${slotLabel} to ${prize.label}. Expires ${expiryLabel}. You can keep spinning!`
          : `${prize.label} saved! Expires ${expiryLabel}. You can keep spinning!`,
        prize,
        savedCoupons: result.savedCoupons,
        replacedPrevious: result.replacedPrevious,
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