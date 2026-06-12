import { calculateShipping } from '@/lib/checkout';
import { computeLoyaltyDiscount } from '@/lib/loyalty';
import { getSessionUserId } from '@/lib/auth';
import { validateSpinPrizeForCheckout } from '@/lib/spinWheel';

export interface ResolvedOrderTotals {
  promoDiscount: number;
  loyaltyPointsUsed: number;
  loyaltyDiscount: number;
  spinDiscount: number;
  spinPrizeId?: string;
  spinPrizeLabel?: string;
  freeTshirt: boolean;
  discount: number;
  shipping: number;
  total: number;
}

export async function resolveOrderTotals(input: {
  subtotal: number;
  promoDiscount?: number;
  loyaltyPointsUsed?: number;
  shipping?: number;
  spinPrizeId?: string;
}): Promise<ResolvedOrderTotals> {
  const subtotal = input.subtotal ?? 0;
  const promoDiscount = input.promoDiscount ?? 0;
  const loyaltyPointsUsed = input.loyaltyPointsUsed ?? 0;
  const userId = await getSessionUserId();

  let spinDiscount = 0;
  let spinPrizeId: string | undefined;
  let spinPrizeLabel: string | undefined;
  let freeShippingFromPrize = false;
  let freeTshirt = false;

  if (input.spinPrizeId) {
    const spin = await validateSpinPrizeForCheckout(userId, input.spinPrizeId, subtotal);
    spinDiscount = spin.spinDiscount;
    spinPrizeId = spin.prize.id;
    spinPrizeLabel = spin.prize.label;
    freeShippingFromPrize = spin.freeShipping;
    freeTshirt = spin.freeTshirt;
  }

  const { loyaltyDiscount, pointsRedeemed } = await computeLoyaltyDiscount(
    userId,
    loyaltyPointsUsed,
    subtotal,
    promoDiscount + spinDiscount
  );

  const discount = Math.min(subtotal, promoDiscount + loyaltyDiscount + spinDiscount);
  let shipping = input.shipping ?? calculateShipping(subtotal);
  if (freeShippingFromPrize) {
    shipping = 0;
  }
  const total = Math.max(0, subtotal - discount + shipping);

  return {
    promoDiscount,
    loyaltyPointsUsed: pointsRedeemed,
    loyaltyDiscount,
    spinDiscount,
    spinPrizeId,
    spinPrizeLabel,
    freeTshirt,
    discount,
    shipping,
    total,
  };
}