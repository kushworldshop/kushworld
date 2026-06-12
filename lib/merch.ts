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