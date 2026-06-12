export interface TierPrice {
  minQty: number;
  price: number;
}

import type { ProductOptionGroup } from '@/lib/productOptions';

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
  category: string;
  description?: string;
  coaPdf?: string;
  tierPricing?: TierPrice[];
  compareAtPrice?: number;
  merchSubcategory?: string;
  subcategory?: string;
  featured?: boolean;
  studioUrl?: string;
  hidden?: boolean;
}

export function getProductSlug(product: Product): string {
  if (product.slug) return product.slug;
  return product.image.replace(/^\/products\//, '').replace(/\.[^.]+$/, '');
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
  flower: 'Exotic flower strain. Hand-selected, lab-tested, and shipped discreetly with full COA documentation.',
  mushrooms: 'Premium mushroom product. Lab verified. For adults 21+ only.',
  merch: 'Official Kush World Studio apparel and accessories. Unisex fit. Direct-to-garment print quality.',
};

export function getProductDescription(product: Product): string {
  if (product.description) return product.description;
  return `${product.name} — ${CATEGORY_DESCRIPTIONS[product.category] || 'Authentic Kush World product. Lab tested with COA available.'}`;
}

export function getTierPricing(product: Product): TierPrice[] {
  if (product.tierPricing?.length) return product.tierPricing;
  if (product.price >= 500) {
    return [
      { minQty: 3, price: Math.round(product.price * 0.95) },
      { minQty: 5, price: Math.round(product.price * 0.9) },
    ];
  }
  if (product.price >= 50) {
    return [{ minQty: 5, price: Math.round(product.price * 0.95) }];
  }
  return [];
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
    "category": "concentrates"
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
  }
];

import { getMerchProducts } from '@/lib/merch';

export const products: Product[] = [
  ...hempProducts,
  ...getMerchProducts(),
];
