export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  sizes?: string[];
  category: string;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Glass Bong - 14mm",
    price: 89.99,
    image: "/products/bong1.jpg",   // Update with your real images later
    sizes: [],
    category: "glass"
  },
  {
    id: "2",
    name: "Ceramic Pipe",
    price: 24.99,
    image: "/products/pipe1.jpg",
    sizes: [],
    category: "pipes"
  },
  // Add all your real products here with id as string ("1", "2", etc.)
  // Example for clothing:
  // {
  //   id: "3",
  //   name: "Kush World Hoodie",
  //   price: 59.99,
  //   image: "/products/hoodie.jpg",
  //   sizes: ["S", "M", "L", "XL"],
  //   category: "apparel"
  // },
];