'use client';

import { useEffect } from 'react';
import { useWishlistStore } from '@/lib/wishlistStore';

export default function WishlistSync() {
  const syncFromServer = useWishlistStore((state) => state.syncFromServer);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);

  useEffect(() => {
    fetch('/api/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          syncFromServer();
        } else {
          clearWishlist();
        }
      })
      .catch(() => clearWishlist());
  }, [syncFromServer, clearWishlist]);

  return null;
}