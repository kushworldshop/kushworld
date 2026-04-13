import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  selectedSize?: string;
}

interface CartStore {
  items: CartItem[];
  addToCart: (product: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addToCart: (product) => set((state) => {
    const existingIndex = state.items.findIndex(
      (item) => item.id === product.id && item.selectedSize === product.selectedSize
    );

    if (existingIndex !== -1) {
      const updatedItems = [...state.items];
      updatedItems[existingIndex].quantity += product.quantity || 1;
      return { items: updatedItems };
    } else {
      return {
        items: [...state.items, { ...product, quantity: product.quantity || 1 }]
      };
    }
  }),

  removeItem: (index) => set((state) => ({
    items: state.items.filter((_, i) => i !== index)
  })),

  updateQuantity: (index, quantity) => set((state) => {
    if (quantity < 1) return state;
    const updatedItems = [...state.items];
    updatedItems[index].quantity = quantity;
    return { items: updatedItems };
  }),

  clearCart: () => set({ items: [] }),

  subtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));