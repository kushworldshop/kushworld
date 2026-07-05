import {
  DEFAULT_SHIPPING_THRESHOLDS,
  getFreeShippingThreshold,
  qualifiesForFreeShipping,
  type ShippingCartItem,
  type ShippingThresholds,
} from '@/lib/shipping';

export const MIN_ORDER_AMOUNT = 25;
export const FIRST_ORDER_DISCOUNT = 20;
export const FIRST_ORDER_CODE = 'FIRST20';
export const HEMP_FREE_SHIPPING_THRESHOLD = DEFAULT_SHIPPING_THRESHOLDS.hemp;
export const MERCH_FREE_SHIPPING_THRESHOLD = DEFAULT_SHIPPING_THRESHOLDS.merch;
/** @deprecated Use getFreeShippingThreshold(items) — kept for legacy imports */
export const FREE_SHIPPING_THRESHOLD = HEMP_FREE_SHIPPING_THRESHOLD;
export const FLAT_SHIPPING_RATE = 9.99;

export const RESTRICTED_STATES = ['ID', 'KS', 'NE', 'SD', 'WY'];

export type ShippingMethod = 'usps_ground' | 'usps_priority';

/** @deprecated Legacy checkout value — treated as USPS General Ground */
export type LegacyShippingCarrier = 'usps';

export type ShippingCarrier = ShippingMethod | LegacyShippingCarrier;

export interface ShippingOption {
  id: string;
  label: string;
  rate: number;
  eta: string;
  carrier: 'usps' | 'fedex' | 'ups';
  btcPostageService?: string;
  source?: 'static' | 'btcpostage';
}

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  freeShipping: boolean;
  shippingCarrier?: ShippingMethod;
  shippingLabel?: string;
}

const SHIPPING_RATES: Record<ShippingMethod, number> = {
  usps_ground: FLAT_SHIPPING_RATE,
  usps_priority: 25,
};

const SHIPPING_OPTIONS: Omit<ShippingOption, 'rate'>[] = [
  {
    id: 'usps_ground',
    label: 'USPS General Ground',
    eta: '5–7 business days via USPS',
    carrier: 'usps',
  },
  {
    id: 'usps_priority',
    label: 'USPS Priority',
    eta: '2–3 business days via USPS',
    carrier: 'usps',
  },
];

export const SHIPPING_DIMENSION_NOTE =
  'Rates are based on package dimensions and weight.';

export const FEDEX_ALTERNATIVE_NOTE =
  'FedEx is also available as an alternative carrier — ask us after checkout if you prefer FedEx.';

export function normalizeShippingMethod(method?: string): ShippingMethod {
  if (method === 'usps' || method === 'usps_ground') return 'usps_ground';
  if (method === 'usps_priority') return 'usps_priority';
  if (method === 'fedex') return 'usps_ground';
  return 'usps_ground';
}

export function getShippingOptions(
  subtotal: number,
  items: ShippingCartItem[] = [],
  thresholds: ShippingThresholds = DEFAULT_SHIPPING_THRESHOLDS
): ShippingOption[] {
  const free = qualifiesForFreeShipping(subtotal, items, thresholds);
  return SHIPPING_OPTIONS.map((option) => ({
    ...option,
    rate: free ? 0 : SHIPPING_RATES[option.id as ShippingMethod],
  }));
}

export function getShippingLabel(method: ShippingCarrier): string {
  const normalized = normalizeShippingMethod(method);
  return SHIPPING_OPTIONS.find((option) => option.id === normalized)?.label ?? 'USPS General Ground';
}

export function getShippingCarrier(method: ShippingCarrier): 'usps' | 'fedex' | 'ups' {
  const normalized = normalizeShippingMethod(method);
  return SHIPPING_OPTIONS.find((option) => option.id === normalized)?.carrier ?? 'usps';
}

export function calculateShipping(
  subtotal: number,
  method: ShippingCarrier = 'usps_ground',
  items: ShippingCartItem[] = [],
  thresholds: ShippingThresholds = DEFAULT_SHIPPING_THRESHOLDS
): number {
  if (subtotal <= 0) return 0;
  const normalized = normalizeShippingMethod(method);
  const option = getShippingOptions(subtotal, items, thresholds).find((item) => item.id === normalized);
  return option?.rate ?? 0;
}

export function calculateTotals(
  subtotal: number,
  discount = 0,
  method: ShippingCarrier = 'usps_ground',
  items: ShippingCartItem[] = [],
  thresholds: ShippingThresholds = DEFAULT_SHIPPING_THRESHOLDS
): CheckoutTotals {
  const normalized = normalizeShippingMethod(method);
  const shipping = calculateShipping(subtotal, normalized, items, thresholds);
  const total = Math.max(0, subtotal - discount + shipping);

  return {
    subtotal,
    discount,
    shipping,
    total,
    freeShipping: shipping === 0 && subtotal > 0,
    shippingCarrier: normalized,
    shippingLabel: getShippingLabel(normalized),
  };
}

export { getFreeShippingThreshold, qualifiesForFreeShipping, type ShippingCartItem, type ShippingThresholds };

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