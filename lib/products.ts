export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  availableSizes?: string[];   // New field for clothing
}

export const products: Product[] = [
  {
    id: 1,
    name: "KUSH WORLD T-SHIRT",
    price: 35,
    image: "https://picsum.photos/id/1015/600/600",
    category: "Merch & Apparel",
    availableSizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    id: 2,
    name: "KUSH WORLD HOODIE",
    price: 65,
    image: "https://picsum.photos/id/1027/600/600",
    category: "Merch & Apparel",
    availableSizes: ["S", "M", "L", "XL", "XXL"]
  },
  {
    id: 3,
    name: "KUSH WORLD SNAPBACK",
    price: 28,
    image: "https://picsum.photos/id/106/600/600",
    category: "Merch & Apparel",
    availableSizes: ["One Size"]
  },
  {
    id: 4,
    name: "4-Piece Aluminum Grinder",
    price: 25,
    image: "https://picsum.photos/id/201/600/600",
    category: "Accessories"
  },
  {
    id: 5,
    name: "Ceramic Chill Pipe",
    price: 18,
    image: "https://picsum.photos/id/133/600/600",
    category: "Pipes & Dab Rigs"
  },
  {
    id: 6,
    name: "Classic Glass Bong",
    price: 85,
    image: "https://picsum.photos/id/180/600/600",
    category: "Bongs & Water Pipes"
  },
  {
    id: 7,
    name: "KUSH WORLD CREW SOCKS",
    price: 15,
    image: "https://picsum.photos/id/1060/600/600",
    category: "Merch & Apparel",
    availableSizes: ["One Size"]
  }
];