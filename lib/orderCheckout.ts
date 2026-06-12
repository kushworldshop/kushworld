import { calculateShipping } from '@/lib/checkout';
import { computeLoyaltyDiscount } from '@/lib/loyalty';
import { getSessionUserId } from '@/lib/auth';

export interface ResolvedOrderTotals {
  promoDiscount: number;
  loyaltyPointsUsed: number;
  loyaltyDiscount: number;
  discount: number;
  shipping: number;
  total: number;
}

export async function resolveOrderTotals(input: {
  subtotal: number;
  promoDiscount?: number;
  loyaltyPointsUsed?: number;
  shipping?: number;
}): Promise<ResolvedOrderTotals> {
  const subtotal = input.subtotal ?? 0;
  const promoDiscount = input.promoDiscount ?? 0;
  const loyaltyPointsUsed = input.loyaltyPointsUsed ?? 0;
  const userId = await getSessionUserId();

  const { loyaltyDiscount, pointsRedeemed } = await computeLoyaltyDiscount(
    userId,
    loyaltyPointsUsed,
    subtotal,
    promoDiscount
  );

  const discount = promoDiscount + loyaltyDiscount;
  const shipping = input.shipping ?? calculateShipping(subtotal);
  const total = Math.max(0, subtotal - discount + shipping);

  return {
    promoDiscount,
    loyaltyPointsUsed: pointsRedeemed,
    loyaltyDiscount,
    discount,
    shipping,
    total,
  };
}