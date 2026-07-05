import { create } from 'zustand';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category?: string;
}

export type WishlistToggleResult = 'added' | 'removed' | 'login_required' | 'error';

interface WishlistStore {
  items: WishlistItem[];
  loaded: boolean;
  syncing: boolean;
  syncFromServer: () => Promise<boolean>;
  addToWishlist: (product: WishlistItem) => Promise<WishlistToggleResult>;
  removeFromWishlist: (id: string) => Promise<WishlistToggleResult>;
  toggleWishlist: (product: WishlistItem) => Promise<WishlistToggleResult>;
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
}

async function parseWishlistResponse(res: Response): Promise<{
  ok: boolean;
  items: WishlistItem[];
  loginRequired: boolean;
}> {
  if (res.status === 401) {
    return { ok: false, items: [], loginRequired: true };
  }
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok && data.success,
    items: Array.isArray(data.items) ? data.items : [],
    loginRequired: false,
  };
}

export const useWishlistStore = create<WishlistStore>()((set, get) => ({
  items: [],
  loaded: false,
  syncing: false,

  syncFromServer: async () => {
    if (get().syncing) return false;
    set({ syncing: true });
    try {
      const res = await fetch('/api/wishlist');
      const parsed = await parseWishlistResponse(res);
      if (parsed.loginRequired) {
        set({ items: [], loaded: true, syncing: false });
        return false;
      }
      if (parsed.ok) {
        set({ items: parsed.items, loaded: true, syncing: false });
        return true;
      }
      set({ loaded: true, syncing: false });
      return false;
    } catch {
      set({ loaded: true, syncing: false });
      return false;
    }
  },

  addToWishlist: async (product) => {
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      const parsed = await parseWishlistResponse(res);
      if (parsed.loginRequired) return 'login_required';
      if (!parsed.ok) return 'error';
      set({ items: parsed.items, loaded: true });
      return 'added';
    } catch {
      return 'error';
    }
  },

  removeFromWishlist: async (id) => {
    try {
      const res = await fetch(`/api/wishlist?productId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const parsed = await parseWishlistResponse(res);
      if (parsed.loginRequired) return 'login_required';
      if (!parsed.ok) return 'error';
      set({ items: parsed.items, loaded: true });
      return 'removed';
    } catch {
      return 'error';
    }
  },

  toggleWishlist: async (product) => {
    if (get().isInWishlist(product.id)) {
      return get().removeFromWishlist(product.id);
    }
    return get().addToWishlist(product);
  },

  isInWishlist: (id) => get().items.some((item) => item.id === id),

  clearWishlist: () => set({ items: [], loaded: false }),
}));