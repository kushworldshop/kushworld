import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { pointsToDollarDiscount, validateLoyaltyRedemption } from '@/lib/loyaltyUtils';
import { getUserById } from '@/lib/users';

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json(
        { valid: false, error: 'Login required to redeem loyalty points' },
        { status: 401 }
      );
    }

    const { pointsToUse = 0, subtotal = 0, promoDiscount = 0 } = await request.json();
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ valid: false, error: 'User not found' }, { status: 404 });
    }

    const validation = validateLoyaltyRedemption(
      pointsToUse,
      user.loyaltyPoints ?? 0,
      subtotal,
      promoDiscount
    );

    return NextResponse.json({
      valid: validation.valid,
      error: validation.error,
      maxPoints: validation.maxPoints,
      availablePoints: user.loyaltyPoints ?? 0,
      discount: validation.valid ? pointsToDollarDiscount(pointsToUse) : 0,
    });
  } catch {
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 });
  }
}