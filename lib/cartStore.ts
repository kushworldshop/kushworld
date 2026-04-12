import { create } from 'zustand';
import { Product } from './products';

export interface CartItem {
  product: Product;
  quantity: number;
  size?: string;        // This will store the selected size
}

interface CartStore {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, size?: string) => void;
  removeFromCart: (productId: number, size?: string) => void;
  updateQuantity: (productId: number, newQuantity: number, size?: string) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addToCart: (product, quantity, size) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.product.id === product.id && item.size === size
      );

      if (existingIndex !== -1) {
        // Increase quantity if same product + same size already exists
        const updatedItems = [...state.items];
        updatedItems[existingIndex].quantity += quantity;
        return { items: updatedItems };
      } else {
        // Add new item with size
        return {
          items: [...state.items, { product, quantity, size }]
        };
      }
    });
  },

  removeFromCart: (productId, size) => {
    set((state) => ({
      items: state.items.filter(
        (item) => !(item.product.id === productId && item.size === size)
      )
    }));
  },

  updateQuantity: (productId, newQuantity, size) => {
    if (newQuantity < 1) return;
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId && item.size === size
          ? { ...item, quantity: newQuantity }
          : item
      )
    }));
  },

  clearCart: () => set({ items: [] }),

  totalItems: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  subtotal: () => {
    return get().items.reduce((sum, item) => 
      sum + item.product.price * item.quantity, 0
    );
  },
}));