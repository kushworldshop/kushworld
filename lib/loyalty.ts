import { PURCHASE_POINTS_PER_DOLLAR } from '@/lib/referralConstants';
import { addLoyaltyPoints } from '@/lib/users';

export function calculatePurchasePoints(subtotal: number): number {
  return Math.floor(subtotal * PURCHASE_POINTS_PER_DOLLAR);
}

export function pointsToDollarDiscount(points: number): number {
  return points * 0.01;
}

export async function awardPurchaseLoyalty(userId: string, subtotal: number): Promise<number> {
  const points = calculatePurchasePoints(subtotal);
  if (points <= 0) return 0;
  return addLoyaltyPoints(userId, points);
}