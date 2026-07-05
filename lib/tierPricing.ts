import type { TierPrice } from '@/lib/products';

export function getDefaultTierPricing(price: number): TierPrice[] {
  if (price >= 500) {
    return [
      { minQty: 3, price: Math.round(price * 0.95) },
      { minQty: 5, price: Math.round(price * 0.9) },
    ];
  }
  if (price >= 50) {
    return [{ minQty: 5, price: Math.round(price * 0.95) }];
  }
  return [];
}

export function sanitizeTierPricing(input: unknown): TierPrice[] {
  if (!Array.isArray(input)) return [];

  const tiers: TierPrice[] = [];
  const seen = new Set<number>();

  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const minQty = Math.floor(Number((item as TierPrice).minQty));
    const tierPrice = Number((item as TierPrice).price);
    if (!Number.isFinite(minQty) || !Number.isFinite(tierPrice) || minQty < 2) continue;
    if (seen.has(minQty)) continue;
    seen.add(minQty);
    tiers.push({
      minQty,
      price: Math.round(Math.max(0, tierPrice) * 100) / 100,
    });
  }

  return tiers.sort((a, b) => a.minQty - b.minQty);
}

export function getEffectiveTierPricing(product: {
  price: number;
  tierPricing?: TierPrice[];
}): TierPrice[] {
  if (product.tierPricing?.length) return product.tierPricing;
  return getDefaultTierPricing(product.price);
}

export function formatTierPricingSummary(tiers: TierPrice[]): string {
  if (!tiers.length) return 'No bulk pricing on shop';
  return tiers.map((tier) => `${tier.minQty}+ @ $${tier.price.toFixed(2)}`).join(' · ');
}

export function describeAutoTierPricingRules(): string {
  return '$50+ sell price → 5+ units at 95%. $500+ → 3+ at 95%, 5+ at 90%.';
}