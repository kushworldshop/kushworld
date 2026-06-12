export const MIN_ORDER_AMOUNT = 25;
export const FIRST_ORDER_DISCOUNT = 20;
export const FIRST_ORDER_CODE = 'FIRST20';
export const FREE_SHIPPING_THRESHOLD = 200;
export const FLAT_SHIPPING_RATE = 9.99;

export const RESTRICTED_STATES = ['ID', 'KS', 'NE', 'SD', 'WY'];

export type ShippingCarrier = 'usps' | 'fedex';

export interface ShippingOption {
  id: ShippingCarrier;
  label: string;
  rate: number;
  eta: string;
}

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  freeShipping: boolean;
  shippingCarrier?: ShippingCarrier;
  shippingLabel?: string;
}

const SHIPPING_RATES: Record<ShippingCarrier, number> = {
  usps: 9.99,
  fedex: 14.99,
};

export function getShippingOptions(subtotal: number): ShippingOption[] {
  const free = subtotal >= FREE_SHIPPING_THRESHOLD;
  return [
    {
      id: 'usps',
      label: 'USPS Priority Mail',
      rate: free ? 0 : SHIPPING_RATES.usps,
      eta: '3–5 business days',
    },
    {
      id: 'fedex',
      label: 'FedEx Ground',
      rate: free ? 0 : SHIPPING_RATES.fedex,
      eta: '2–4 business days',
    },
  ];
}

export function getShippingLabel(carrier: ShippingCarrier): string {
  return carrier === 'fedex' ? 'FedEx Ground' : 'USPS Priority Mail';
}

export function calculateShipping(subtotal: number, carrier: ShippingCarrier = 'usps'): number {
  if (subtotal <= 0) return 0;
  const option = getShippingOptions(subtotal).find((item) => item.id === carrier);
  return option?.rate ?? 0;
}

export function calculateTotals(
  subtotal: number,
  discount = 0,
  carrier: ShippingCarrier = 'usps'
): CheckoutTotals {
  const shipping = calculateShipping(subtotal, carrier);
  const total = Math.max(0, subtotal - discount + shipping);

  return {
    subtotal,
    discount,
    shipping,
    total,
    freeShipping: shipping === 0 && subtotal > 0,
    shippingCarrier: carrier,
    shippingLabel: getShippingLabel(carrier),
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