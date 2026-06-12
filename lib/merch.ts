import catalog from '@/lib/merch-catalog.json';

export interface MerchProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  images?: string[];
  sizes?: string[];
  colors?: string[];
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

export function getHomepageMerch(limit = 4): MerchProduct[] {
  const picked: MerchProduct[] = [];

  for (const sub of HOMEPAGE_SUBCATEGORIES) {
    const item =
      merchProducts.find((p) => p.merchSubcategory === sub && p.featured) ??
      merchProducts.find((p) => p.merchSubcategory === sub);
    if (item && !picked.some((p) => p.id === item.id)) {
      picked.push(item);
    }
  }

  if (picked.length >= limit) return picked.slice(0, limit);
  return getFeaturedMerch(limit);
}

export function getMerchSubcategoryLabel(sub?: string): string {
  const labels: Record<string, string> = {
    hoodies: 'Hoodies',
    tees: 'T-Shirts',
    headwear: 'Hats & Beanies',
    accessories: 'Accessories',
    home: 'Home & Decor',
    apparel: 'Apparel',
    merch: 'Merch',
  };
  return labels[sub ?? ''] ?? 'Merch';
}