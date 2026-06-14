import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category?: string;
}

function trackWishlistAdd(product: WishlistItem) {
  if (typeof window === 'undefined') return;
  fetch('/api/wishlist/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', ...product }),
  }).catch(() => {});
}

interface WishlistStore {
  items: WishlistItem[];
  addToWishlist: (product: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  toggleWishlist: (product: WishlistItem) => void;
  isInWishlist: (id: string) => boolean;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addToWishlist: (product) => {
        const alreadyIn = get().items.some((item) => item.id === product.id);
        if (!alreadyIn) {
          trackWishlistAdd(product);
        }
        set((state) => ({
          items: alreadyIn ? state.items : [...state.items, product],
        }));
      },

      removeFromWishlist: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      toggleWishlist: (product) => {
        const isAlreadyIn = get().isInWishlist(product.id);
        if (isAlreadyIn) {
          get().removeFromWishlist(product.id);
        } else {
          get().addToWishlist(product);
        }
      },

      isInWishlist: (id) => get().items.some((item) => item.id === id),
    }),
    {
      name: 'kushworld-wishlist',
      skipHydration: true,
    }
  )
);