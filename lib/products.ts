export type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  description?: string;
  sizes?: string[];
};

export const products: Product[] = [
  {
    id: 1,
    name: "Classic Glass Bong - 14\"",
    price: 59.99,
    image: "/products/glass-bong-classic.jpg",
    category: "Bongs",
    description: "Premium borosilicate glass with ice catcher and perc. Lab tested.",
  },
  {
    id: 2,
    name: "Organic Hemp Hoodie - Black",
    price: 49.99,
    image: "/products/hemp-hoodie-black.jpg",
    category: "Apparel",
    description: "Super soft organic hemp blend. Perfect for everyday wear.",
    sizes: ["S", "M", "L", "XL", "XXL"],
  },
  {
    id: 3,
    name: "Metal Herb Grinder - 4 Piece",
    price: 24.99,
    image: "/products/grinder-metal.jpg",
    category: "Grinders",
    description: "Heavy duty aluminum grinder with pollen catcher.",
  },
  // ← Add all your real products here. For clothing, always include sizes array.
];