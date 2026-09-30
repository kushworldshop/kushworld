import type { Product } from '@/lib/products';

const FLOWER_TIER_FROM_SUBCATEGORY: Record<string, string> = {
  indoor: 'Indoor',
  smalls: 'Smalls',
  exotic: 'Exotic',
  budget: 'Budget',
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  disposables: 'Disposable',
  cartridges: 'Cartridge',
  crumble: 'Crumble',
  badder: 'Badder',
  sugar: 'Sugar',
  indoor: 'Indoor',
  smalls: 'Smalls',
  exotic: 'Exotic',
  budget: 'Budget',
};

export function getDisplayTier(product: Pick<Product, 'tier' | 'subcategory' | 'category'>): string | undefined {
  const stored = product.tier?.trim();
  if (stored) return stored;
  const sub = (product.subcategory || '').trim().toLowerCase();
  if (product.category === 'flower' && FLOWER_TIER_FROM_SUBCATEGORY[sub]) {
    return FLOWER_TIER_FROM_SUBCATEGORY[sub];
  }
  return undefined;
}

export function getDisplaySubcategoryLabel(product: Pick<Product, 'subcategory' | 'category'>): string | undefined {
  const sub = (product.subcategory || '').trim().toLowerCase();
  if (!sub) return undefined;
  if (product.category === 'flower' && FLOWER_TIER_FROM_SUBCATEGORY[sub]) return undefined;
  return SUBCATEGORY_LABELS[sub] ?? undefined;
}

export function tierBadgeClass(tier: string): string {
  const key = tier.toLowerCase();
  if (key === 'budget') return 'bg-zinc-800 text-zinc-200 border border-zinc-600';
  if (key === 'smalls') return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
  if (key === 'indoor') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  if (key === 'exotic') return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
}
