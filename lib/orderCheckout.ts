import {
  calculateShipping,
  getShippingCarrier,
  getShippingLabel,
  normalizeShippingMethod,
  type ShippingCarrier,
  type ShippingMethod,
} from '@/lib/checkout';
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
  shippingCarrier: 'usps' | 'fedex' | 'ups';
  shippingMethod: string;
  shippingMethodId: ShippingMethod;
  total: number;
}

export async function resolveOrderTotals(input: {
  subtotal: number;
  promoDiscount?: number;
  loyaltyPointsUsed?: number;
  shipping?: number;
  shippingCarrier?: ShippingCarrier;
  shippingAmount?: number;
  shippingMethodLabel?: string;
  shippingCarrierFamily?: 'usps' | 'fedex' | 'ups';
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

  if (input.spinPrizeId && promoDiscount > 0) {
    throw new Error('Wheel coupons cannot be combined with promo codes. Remove one to continue.');
  }

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
  const shippingMethodId = normalizeShippingMethod(input.shippingCarrier);
  const usingLiveShipping =
    typeof input.shippingAmount === 'number' && Number.isFinite(input.shippingAmount);
  let shipping = usingLiveShipping
    ? Math.max(0, input.shippingAmount as number)
    : calculateShipping(subtotal, shippingMethodId);
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
    shippingCarrier: usingLiveShipping
      ? (input.shippingCarrierFamily || 'usps')
      : getShippingCarrier(shippingMethodId),
    shippingMethod: usingLiveShipping
      ? (input.shippingMethodLabel || 'Live shipping rate')
      : getShippingLabel(shippingMethodId),
    shippingMethodId,
    total,
  };
}