export const MIN_REDEMPTION_POINTS = 100;
export const POINTS_PER_DOLLAR = 100;

export function pointsToDollarDiscount(points: number): number {
  return Math.round(points) * 0.01;
}

export function calculateMaxRedeemablePoints(
  availablePoints: number,
  subtotal: number,
  promoDiscount: number
): number {
  const maxDiscountDollars = Math.max(0, subtotal - promoDiscount);
  const maxBySubtotal = Math.floor(maxDiscountDollars * POINTS_PER_DOLLAR);
  return Math.max(0, Math.min(Math.floor(availablePoints), maxBySubtotal));
}

export function validateLoyaltyRedemption(
  pointsToUse: number,
  availablePoints: number,
  subtotal: number,
  promoDiscount: number
): { valid: boolean; error?: string; maxPoints: number } {
  const maxPoints = calculateMaxRedeemablePoints(availablePoints, subtotal, promoDiscount);

  if (pointsToUse <= 0) {
    return { valid: true, maxPoints };
  }

  if (pointsToUse < MIN_REDEMPTION_POINTS) {
    return {
      valid: false,
      maxPoints,
      error: `Minimum ${MIN_REDEMPTION_POINTS} points to redeem ($${(MIN_REDEMPTION_POINTS / POINTS_PER_DOLLAR).toFixed(2)} off)`,
    };
  }

  if (pointsToUse > availablePoints) {
    return { valid: false, maxPoints, error: 'Not enough loyalty points' };
  }

  if (pointsToUse > maxPoints) {
    return { valid: false, maxPoints, error: 'Points exceed order maximum' };
  }

  return { valid: true, maxPoints };
}