import type { Product } from '@/lib/products';

export interface ShopBrand {
  id: string;
  label: string;
  match: RegExp;
  href: string;
}

export const SHOP_BRANDS: ShopBrand[] = [
  { id: 'whole-melt', label: 'Whole Melt', match: /whole\s*melt/i, href: '/shop/concentrates' },
  { id: 'arcadia', label: 'Arcadia', match: /arcadia/i, href: '/shop/flower' },
  { id: 'terp-burst', label: 'Terp Burst', match: /terp\s*burst/i, href: '/shop/edibles' },
  { id: 'stoner-stix', label: 'Stoner Stix', match: /stoner\s*stix/i, href: '/shop/vaporizers' },
  { id: 'faded-froots', label: 'Faded Froots', match: /faded\s*froots/i, href: '/shop/edibles' },
  { id: 'kush-world', label: 'Kush World Studio', match: /kush\s*world/i, href: '/shop/merch' },
];

export function getBrandForProduct(product: Product): ShopBrand | undefined {
  const haystack = `${product.name} ${product.description ?? ''}`;
  return SHOP_BRANDS.find((brand) => brand.match.test(haystack));
}

export function getActiveShopBrands(products: Product[]): ShopBrand[] {
  const visible = products.filter((product) => !product.hidden);
  return SHOP_BRANDS.filter((brand) =>
    visible.some((product) => brand.match.test(`${product.name} ${product.description ?? ''}`))
  );
}
