import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartItemsMatchVariant, type SelectedProductOptions } from '@/lib/productOptions';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  selectedOptions?: SelectedProductOptions;
  selectedSize?: string;
  /** Snapshot of option SKUs at add-to-cart time — shown in admin orders */
  optionSkus?: string;
  category?: string;
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

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addToCart: (product) =>
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.id === product.id && cartItemsMatchVariant(item, product)
          );

          if (existingIndex !== -1) {
            const updatedItems = [...state.items];
            updatedItems[existingIndex].quantity += product.quantity || 1;
            return { items: updatedItems };
          }

          return {
            items: [...state.items, { ...product, quantity: product.quantity || 1 }],
          };
        }),

      removeItem: (index) =>
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        })),

      updateQuantity: (index, quantity) =>
        set((state) => {
          if (quantity < 1) return state;
          const updatedItems = [...state.items];
          updatedItems[index].quantity = quantity;
          return { items: updatedItems };
        }),

      clearCart: () => set({ items: [] }),

      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      totalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'kushworld-cart' }
  )
);