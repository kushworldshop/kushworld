import { getProductSlug, type Product } from '@/lib/products';
import type { SiteFeatures } from '@/lib/featureTypes';

const BOARD_CATEGORY_ORDER = ['flower', 'vapes', 'concentrates', 'edibles', 'moonrocks', 'snowcaps'];

export function getBoardProducts(products: Product[], limit = 12): Product[] {
  const hemp = products.filter((product) => !product.hidden && product.category !== 'merch');
  const rank = (category: string) => {
    const index = BOARD_CATEGORY_ORDER.indexOf(category);
    return index === -1 ? 99 : index;
  };

  return [...hemp]
    .sort((a, b) => {
      const byCategory = rank(a.category) - rank(b.category);
      if (byCategory !== 0) return byCategory;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export function getDropProduct(products: Product[], slug?: string): Product | null {
  const hemp = products.filter((product) => !product.hidden && product.category !== 'merch');
  if (slug) {
    const match = hemp.find((product) => getProductSlug(product) === slug);
    if (match) return match;
  }
  return (
    hemp.find((product) => product.isNew && product.category === 'flower') ||
    hemp.find((product) => product.category === 'flower') ||
    hemp[0] ||
    null
  );
}

export function isOnSale(product: Product): boolean {
  return (
    product.compareAtPrice !== undefined &&
    product.compareAtPrice > product.price
  );
}

export function getBestSellerProducts(
  products: Product[],
  config: SiteFeatures['bestSellers']
): Product[] {
  const visible = products.filter((p) => !p.hidden);
  const pinned = config.pinnedProductIds
    .map((id) => visible.find((p) => p.id === id))
    .filter((p): p is Product => !!p);

  const pinnedIds = new Set(pinned.map((p) => p.id));
  const rest = visible
    .filter((p) => !pinnedIds.has(p.id))
    .sort((a, b) => {
      const aScore = (a.bestSeller ? 2 : 0) + (a.featured ? 1 : 0);
      const bScore = (b.bestSeller ? 2 : 0) + (b.featured ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      return Number(b.id) - Number(a.id);
    });

  return [...pinned, ...rest].slice(0, config.limit);
}

export function getNewArrivalProducts(
  products: Product[],
  config: SiteFeatures['newArrivals']
): Product[] {
  const visible = products.filter((p) => !p.hidden);
  const flagged = visible.filter((p) => p.isNew);
  const pool = flagged.length > 0 ? flagged : [...visible].reverse();
  return pool.slice(0, config.limit);
}

export function getOnSaleProducts(
  products: Product[],
  config: SiteFeatures['onSale']
): Product[] {
  return products
    .filter((p) => !p.hidden && isOnSale(p))
    .sort((a, b) => {
      const aDiscount = (a.compareAtPrice! - a.price) / a.compareAtPrice!;
      const bDiscount = (b.compareAtPrice! - b.price) / b.compareAtPrice!;
      return bDiscount - aDiscount;
    })
    .slice(0, config.limit);
}