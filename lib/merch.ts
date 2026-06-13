import catalog from '@/lib/merch-catalog.json';

import type { ProductOptionGroup } from '@/lib/productOptions';

export interface MerchProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  optionGroups?: ProductOptionGroup[];
  category: string;
  description?: string;
  compareAtPrice?: number;
  merchSubcategory?: string;
  featured?: boolean;
  studioUrl?: string;
}

export const MERCH_FREE_SHIPPING = 100;
export const STUDIO_URL = 'https://kushworldstudio.co';

export const merchProducts: MerchProduct[] = (catalog as MerchProduct[]).map((item) => ({
  ...item,
  category: 'merch',
  compareAtPrice: item.compareAtPrice ?? undefined,
}));

export function getMerchProducts(): MerchProduct[] {
  return merchProducts;
}

export function getFeaturedMerch(limit = 8): MerchProduct[] {
  const featured = merchProducts.filter((p) => p.featured);
  const rest = merchProducts.filter((p) => !p.featured);
  return [...featured, ...rest].slice(0, limit);
}

const HOMEPAGE_SUBCATEGORIES = ['hoodies', 'tees', 'headwear', 'accessories'] as const;

export function getHomepageMerchFromProducts<T extends MerchProduct>(products: T[], limit = 4): T[] {
  const merchOnly = products.filter((product) => product.category === 'merch');
  const picked: T[] = [];

  for (const sub of HOMEPAGE_SUBCATEGORIES) {
    const item =
      merchOnly.find((product) => product.merchSubcategory === sub && product.featured) ??
      merchOnly.find((product) => product.merchSubcategory === sub);
    if (item && !picked.some((product) => product.id === item.id)) {
      picked.push(item);
    }
  }

  if (picked.length >= limit) return picked.slice(0, limit);

  const featured = merchOnly.filter((product) => product.featured);
  const rest = merchOnly.filter((product) => !product.featured);
  return [...featured, ...rest].slice(0, limit);
}

export function getHomepageMerch(limit = 4): MerchProduct[] {
  return getHomepageMerchFromProducts(merchProducts, limit);
}

export const MERCH_SUBCATEGORIES = [
  { id: 'hoodies', label: 'Hoodies' },
  { id: 'tees', label: 'T-Shirts' },
  { id: 'headwear', label: 'Hats & Beanies' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'apparel', label: 'Apparel' },
  { id: 'home', label: 'Home & Decor' },
  { id: 'merch', label: 'General Merch' },
] as const;

export type MerchSubcategoryId = (typeof MERCH_SUBCATEGORIES)[number]['id'];

export function getMerchSubcategoryLabel(sub?: string): string {
  const match = MERCH_SUBCATEGORIES.find((item) => item.id === sub);
  return match?.label ?? 'Merch';
}