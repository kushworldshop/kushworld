import type { Product } from '@/lib/products';
import type { SiteFeatures } from '@/lib/featureTypes';

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