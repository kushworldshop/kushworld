export const MIN_ORDER_AMOUNT = 25;
export const FIRST_ORDER_DISCOUNT = 20;
export const FIRST_ORDER_CODE = 'FIRST20';
export const FREE_SHIPPING_THRESHOLD = 200;
export const FLAT_SHIPPING_RATE = 9.99;

export const RESTRICTED_STATES = ['ID', 'KS', 'NE', 'SD', 'WY'];

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  freeShipping: boolean;
}

export function calculateShipping(subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return subtotal > 0 ? FLAT_SHIPPING_RATE : 0;
}

export function calculateTotals(
  subtotal: number,
  discount = 0
): CheckoutTotals {
  const shipping = calculateShipping(subtotal);
  const total = Math.max(0, subtotal - discount + shipping);

  return {
    subtotal,
    discount,
    shipping,
    total,
    freeShipping: shipping === 0 && subtotal > 0,
  };
}

export function getTierPrice(
  basePrice: number,
  quantity: number,
  tiers?: { minQty: number; price: number }[]
): number {
  if (!tiers?.length) return basePrice;

  const applicable = tiers
    .filter((t) => quantity >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];

  return applicable?.price ?? basePrice;
}