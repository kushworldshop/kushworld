export interface ShippingCartItem {
  category?: string;
}

export interface ShippingThresholds {
  hemp: number;
  merch: number;
}

export const DEFAULT_SHIPPING_THRESHOLDS: ShippingThresholds = {
  hemp: 150,
  merch: 100,
};

export function getFreeShippingThreshold(
  items: ShippingCartItem[] = [],
  thresholds: ShippingThresholds = DEFAULT_SHIPPING_THRESHOLDS
): number {
  const hasHemp = items.some((item) => item.category && item.category !== 'merch');
  const hasMerch = items.some((item) => item.category === 'merch');
  if (hasMerch && !hasHemp) return thresholds.merch;
  return thresholds.hemp;
}

export function qualifiesForFreeShipping(
  subtotal: number,
  items: ShippingCartItem[] = [],
  thresholds: ShippingThresholds = DEFAULT_SHIPPING_THRESHOLDS
): boolean {
  if (subtotal <= 0) return false;
  return subtotal >= getFreeShippingThreshold(items, thresholds);
}

export function getFreeShippingRemaining(
  subtotal: number,
  items: ShippingCartItem[] = [],
  thresholds: ShippingThresholds = DEFAULT_SHIPPING_THRESHOLDS
): number {
  return Math.max(0, getFreeShippingThreshold(items, thresholds) - subtotal);
}

export function getFreeShippingProgress(
  subtotal: number,
  items: ShippingCartItem[] = [],
  thresholds: ShippingThresholds = DEFAULT_SHIPPING_THRESHOLDS
): { threshold: number; remaining: number; percent: number; qualified: boolean } {
  const threshold = getFreeShippingThreshold(items, thresholds);
  const qualified = subtotal >= threshold && subtotal > 0;
  const percent = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 0;
  return {
    threshold,
    remaining: Math.max(0, threshold - subtotal),
    percent,
    qualified,
  };
}