import { getEffectiveTierPricing } from '@/lib/tierPricing';
import type { ProductOptionGroup } from '@/lib/productOptions';

export interface TierPrice {
  minQty: number;
  price: number;
}
import type { ProductMediaItem } from '@/lib/productMedia';

export type { ProductMediaItem } from '@/lib/productMedia';

export interface Product {
  id: string;
  name: string;
  price: number;
  cost?: number;
  inventory?: number;
  inStock?: boolean;
  image: string;
  slug?: string;
  sizes?: string[];
  colors?: string[];
  optionGroups?: ProductOptionGroup[];
  images?: string[];
  media?: ProductMediaItem[];
  category: string;
  description?: string;
  coaPdf?: string;
  tierPricing?: TierPrice[];
  /** When true, bulk pricing block is hidden and quantity tiers are not applied at checkout */
  hideBulkPricing?: boolean;
  compareAtPrice?: number;
  merchSubcategory?: string;
  subcategory?: string;
  featured?: boolean;
  bestSeller?: boolean;
  isNew?: boolean;
  studioUrl?: string;
  hidden?: boolean;
  thcaPercent?: number;
  strainType?: string;
  tier?: string;
  effect?: string;
  effects?: string[];
  limitedEdition?: number;
  isDrop?: boolean;
}

function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugFromImagePath(image: string): string {
  const trimmed = image.trim();
  if (!trimmed) return '';
  const withoutExt = trimmed.replace(/\.[^.]+$/, '');
  if (withoutExt.startsWith('/products/')) {
    const relative = withoutExt.slice('/products/'.length);
    if (relative && !relative.includes('/')) return relative;
  }
  return '';
}

/** Stable slug for a catalog (non-custom) product — never changes when cover image is re-uploaded. */
export function getCatalogProductSlug(product: Pick<Product, 'id' | 'name' | 'image' | 'slug'>): string {
  if (product.slug) return product.slug;
  const fromImage = slugFromImagePath(product.image);
  if (fromImage) return fromImage;
  return slugifyProductName(product.name);
}

export function getProductSlug(product: Product): string {
  if (product.slug) return product.slug;
  const base = products.find((item) => item.id === product.id);
  if (base) return getCatalogProductSlug(base);
  const fromImage = slugFromImagePath(product.image);
  if (fromImage) return fromImage;
  return slugifyProductName(product.name);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => getProductSlug(p) === slug);
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function isMerchProduct(product: Product): boolean {
  return product.category === 'merch';
}

export function isProductInStock(product: Pick<Product, 'inStock' | 'inventory'>): boolean {
  if (product.inStock !== undefined) return product.inStock;
  if (product.inventory !== undefined) return product.inventory > 0;
  return true;
}

export function orderRequiresIdVerification(items: { id: string; category?: string }[]): boolean {
  return items.some((item) => {
    if (item.category) return item.category !== 'merch';
    const product = getProductById(item.id);
    return !product || product.category !== 'merch';
  });
}

export function getCoaPdfPath(product: Product): string {
  if (product.coaPdf) return product.coaPdf;
  return `/products/coa/${getProductSlug(product)}.pdf`;
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  vapes: 'Premium disposable vape. Lab-tested for purity and potency. Discreet packaging.',
  concentrates: 'High-quality concentrate. Third-party lab tested with COA available. Store in a cool, dry place.',
  flower: 'Premium hemp flower strain. Hand-selected, lab-tested, and shipped discreetly with full COA documentation.',
  moonrocks: 'Premium hemp moonrocks. Flower coated in concentrate and kief. Lab-tested with COA available. 21+ only.',
  snowcaps: 'Premium hemp snowcaps. Flower dusted with concentrate and kief. Lab-tested with COA available. 21+ only.',
  mushrooms: 'Premium mushroom product. Lab verified. For adults 21+ only.',
  merch: 'Official Kush World Studio apparel and accessories. Unisex fit. Direct-to-garment print quality.',
};

export function getProductDescription(product: Product): string {
  if (product.description) return product.description;
  return `${product.name} — ${CATEGORY_DESCRIPTIONS[product.category] || 'Authentic Kush World product. Lab tested with COA available.'}`;
}

export function getTierPricing(product: Product): TierPrice[] {
  if (product.hideBulkPricing) return [];
  return getEffectiveTierPricing(product);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      getProductDescription(p).toLowerCase().includes(q)
  );
}

const hempProducts: Product[] = [
  {
    "id": "1",
    "name": "CaliClear",
    "price": 11,
    "image": "/products/caliclear.jpg",
    "sizes": [],
    "category": "vapes"
  },
  {
    "id": "2",
    "name": "CookiexMuha",
    "price": 13,
    "image": "/products/cookiexmuha.jpg",
    "sizes": [],
    "category": "vapes"
  },
  {
    "id": "3",
    "name": "Cursed Combo",
    "price": 1000,
    "image": "/products/cursed-combo.jpg",
    "sizes": [],
    "category": "concentrates"
  },
  {
    "id": "4",
    "name": "Cursed Crumble",
    "price": 800,
    "image": "/products/cursed-crumble.jpg",
    "sizes": [],
    "category": "concentrates"
  },
  {
    "id": "5",
    "name": "Cursed Sugar",
    "price": 800,
    "image": "/products/cursed-sugar.jpg",
    "sizes": [],
    "category": "concentrates"
  },
  {
    "id": "6",
    "name": "Fade 3-1",
    "price": 13,
    "image": "/products/fade-3-1.jpg",
    "sizes": [],
    "category": "vapes"
  },
  {
    "id": "7",
    "name": "Flavs 1000MG",
    "price": 5,
    "image": "/products/flavs-1000mg.jpg",
    "sizes": [],
    "category": "vapes"
  },
  {
    "id": "8",
    "name": "Fryd",
    "price": 12,
    "image": "/products/fryd.jpg",
    "sizes": [],
    "category": "vapes"
  },
  {
    "id": "9",
    "name": "Goldiez Crumble",
    "price": 850,
    "image": "/products/goldiez-crumble.jpg",
    "sizes": [],
    "category": "concentrates"
  },
  {
    "id": "10",
    "name": "Goldiez Sugar",
    "price": 850,
    "image": "/products/goldiez-sugar.jpg",
    "sizes": [],
    "category": "concentrates"
  },
  {
    "id": "11",
    "name": "Kaws Cake",
    "price": 700,
    "image": "/products/kaws-cake.jpg",
    "sizes": [],
    "category": "flower"
  },
  {
    "id": "12",
    "name": "Kaws Candy",
    "price": 700,
    "image": "/products/kaws-candy.jpg",
    "sizes": [],
    "category": "flower"
  },
  {
    "id": "13",
    "name": "Kaws Cereal",
    "price": 700,
    "image": "/products/kaws-cereal.jpg",
    "sizes": [],
    "category": "flower"
  },
  {
    "id": "14",
    "name": "Kaws Exotic",
    "price": 700,
    "image": "/products/kaws-exotic.jpg",
    "sizes": [],
    "category": "flower"
  },
  {
    "id": "15",
    "name": "Kaws Gelato",
    "price": 700,
    "image": "/products/kaws-gelato.jpg",
    "sizes": [],
    "category": "flower"
  },
  {
    "id": "16",
    "name": "Kaws Snowcaps",
    "price": 950,
    "image": "/products/kaws-snowcaps.jpg",
    "sizes": [],
    "category": "snowcaps"
  },
  {
    "id": "17",
    "name": "LaBuBu",
    "price": 9,
    "image": "/products/labubu.jpg",
    "sizes": [],
    "category": "vapes"
  },
  {
    "id": "18",
    "name": "Luigi’s",
    "price": 14,
    "image": "/products/luigi-s.jpg",
    "sizes": [],
    "category": "vapes"
  },
  {
    "id": "19",
    "name": "Luminate Badder",
    "price": 850,
    "image": "/products/luminate-badder.jpg",
    "sizes": [],
    "category": "concentrates"
  },
  {
    "id": "20",
    "name": "Luminate Crumble",
    "price": 850,
    "image": "/products/luminate-crumble.jpg",
    "sizes": [],
    "category": "concentrates"
  },
  {
    "id": "21",
    "name": "Madlabs",
    "price": 13,
    "image": "/products/madlabs.jpg",
    "sizes": [],
    "category": "vapes"
  },
  {
    "id": "22",
    "name": "MagicMushrooms",
    "price": 4,
    "image": "/products/magicmushrooms.jpg",
    "sizes": [],
    "category": "mushrooms"
  },
  {
    "id": "23",
    "name": "Phaded",
    "price": 700,
    "image": "/products/phaded.jpg",
    "sizes": [],
    "category": "concentrates"
  },
  {
    "id": "24",
    "name": "Splitz",
    "price": 13,
    "image": "/products/splitz.jpg",
    "sizes": [],
    "category": "vapes"
  },
  {
    "id": "25",
    "name": "TerpBurst",
    "price": 6,
    "image": "/products/terpburst.jpg",
    "sizes": [],
    "category": "vapes"
  },
  {
    "id": "26",
    "name": "Terpies",
    "price": 700,
    "image": "/products/terpies.jpg",
    "sizes": [],
    "category": "concentrates"
  },
  {
    "id": "27",
    "name": "WM Havana",
    "price": 800,
    "image": "/products/wm-havana.jpg",
    "sizes": [],
    "category": "concentrates"
  },
];

import { getMerchProducts } from '@/lib/merch';

export const products: Product[] = [
  ...hempProducts,
  ...getMerchProducts(),
];
