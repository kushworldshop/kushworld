import { validateCoupon } from '@/lib/coupons';
import { calculateReferralDiscount, getReferralByCode } from '@/lib/referrals';
import { getSettings } from '@/lib/settings';

export type PromoSource = 'coupon' | 'loyalty';

export interface PromoValidationResult {
  valid: boolean;
  discount: number;
  error?: string;
  source?: PromoSource;
  code?: string;
  referrerCode?: string;
  referrerName?: string;
}

export async function validatePromoCode(
  code: string,
  subtotal: number,
  isFirstOrder: boolean
): Promise<PromoValidationResult> {
  const trimmed = code?.trim();
  if (!trimmed) {
    return { valid: false, discount: 0, error: 'Enter a promo code' };
  }

  const couponResult = await validateCoupon(trimmed, subtotal, isFirstOrder);
  if (couponResult.valid) {
    return {
      valid: true,
      discount: couponResult.discount,
      source: 'coupon',
      code: trimmed.toUpperCase(),
    };
  }

  const referral = await getReferralByCode(trimmed);
  if (referral) {
    const discountResult = await calculateReferralDiscount(subtotal, isFirstOrder);
    if (!discountResult.valid) {
      return { valid: false, discount: 0, error: discountResult.error };
    }

    return {
      valid: true,
      discount: discountResult.discount,
      source: 'loyalty',
      code: referral.code,
      referrerCode: referral.code,
      referrerName: referral.referrerName,
    };
  }

  return { valid: false, discount: 0, error: couponResult.error || 'Invalid promo code' };
}

export async function getPublicPromoTerms() {
  const settings = await getSettings();
  return {
    customerDiscount: settings.promoCustomerDiscount,
    firstOrderOnly: settings.promoFirstOrderOnly,
    minOrder: settings.promoMinOrder,
    referrerCommissionPercent: settings.referrerCommissionPercent,
    referrerRewardPoints: settings.referrerRewardPoints,
  };
}