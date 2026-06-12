export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  sizes?: string[];
  category: string;
  /** Path to COA PDF in /public/products/coa/ — defaults from product image slug */
  coaPdf?: string;
}

/** Expected COA path: /products/coa/{slug}.pdf — drop PDFs in public/products/coa/ */
export function getCoaPdfPath(product: Product): string {
  if (product.coaPdf) return product.coaPdf;
  const slug = product.image.replace(/^\/products\//, '').replace(/\.[^.]+$/, '');
  return `/products/coa/${slug}.pdf`;
}

export const products: Product[] = [
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
