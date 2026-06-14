import { PURCHASE_POINTS_PER_DOLLAR } from '@/lib/referralConstants';
import {
  pointsToDollarDiscount,
  validateLoyaltyRedemption,
} from '@/lib/loyaltyUtils';
import { addLoyaltyPoints, getRedeemableLoyaltyPoints, getUserById, redeemLoyaltyPoints } from '@/lib/users';

export {
  MIN_REDEMPTION_POINTS,
  POINTS_PER_DOLLAR,
  pointsToDollarDiscount,
  calculateMaxRedeemablePoints,
  validateLoyaltyRedemption,
} from '@/lib/loyaltyUtils';

export function calculatePurchasePoints(subtotal: number): number {
  return Math.floor(subtotal * PURCHASE_POINTS_PER_DOLLAR);
}

export async function computeLoyaltyDiscount(
  userId: string | null,
  pointsToUse: number,
  subtotal: number,
  promoDiscount: number
): Promise<{ loyaltyDiscount: number; pointsRedeemed: number }> {
  if (pointsToUse <= 0) {
    return { loyaltyDiscount: 0, pointsRedeemed: 0 };
  }

  if (!userId) {
    throw new Error('Login required to redeem loyalty points');
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const validation = validateLoyaltyRedemption(
    pointsToUse,
    getRedeemableLoyaltyPoints(user),
    subtotal,
    promoDiscount
  );

  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid loyalty redemption');
  }

  return {
    loyaltyDiscount: pointsToDollarDiscount(pointsToUse),
    pointsRedeemed: pointsToUse,
  };
}

export async function finalizeLoyaltyRedemption(
  userId: string,
  pointsToUse: number
): Promise<void> {
  if (pointsToUse <= 0) return;

  const redeemed = await redeemLoyaltyPoints(userId, pointsToUse);
  if (!redeemed.success) {
    throw new Error(redeemed.error || 'Could not redeem points');
  }
}

export async function awardPurchaseLoyalty(userId: string, subtotal: number): Promise<number> {
  const points = calculatePurchasePoints(subtotal);
  if (points <= 0) return 0;
  return addLoyaltyPoints(userId, points);
}