import { getSessionUserId } from '@/lib/auth';
import { validatePromoCode } from '@/lib/promoCodes';
import { getUserById } from '@/lib/users';

export async function resolvePromoForOrder(input: {
  promoCode?: string;
  referralCode?: string;
  couponCode?: string;
  subtotal: number;
  isFirstOrder: boolean;
}): Promise<{
  promoDiscount: number;
  promoCode?: string;
  promoSource?: string;
  referrerCode?: string;
  referrerName?: string;
}> {
  const code = input.promoCode || input.referralCode || input.couponCode;
  if (!code?.trim()) {
    return { promoDiscount: 0 };
  }

  const result = await validatePromoCode(code, input.subtotal, input.isFirstOrder);
  if (!result.valid) {
    throw new Error(result.error || 'Invalid promo code');
  }

  if (result.referrerCode) {
    const userId = await getSessionUserId();
    if (userId) {
      const user = await getUserById(userId);
      if (user?.referralCode === result.referrerCode) {
        throw new Error('You cannot use your own promo code');
      }
    }
  }

  return {
    promoDiscount: result.discount,
    promoCode: result.code,
    promoSource: result.source,
    referrerCode: result.referrerCode,
    referrerName: result.referrerName,
  };
}