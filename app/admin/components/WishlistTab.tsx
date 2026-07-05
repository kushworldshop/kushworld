'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';

interface WishlistUserSummary {
  userId: string;
  email: string;
  name: string;
  wishlistedAt: string;
}

interface WishlistStat {
  id: string;
  name: string;
  image: string;
  category?: string;
  price?: number;
  count: number;
  lastWishlistedAt: string;
  wishlisters: WishlistUserSummary[];
}

interface WishlistMeta {
  totalWishlists: number;
  uniqueProducts: number;
  uniqueCustomers: number;
  updatedAt: string;
}

export default function WishlistTab() {
  const [wishlistStats, setWishlistStats] = useState<WishlistStat[]>([]);
  const [wishlistMeta, setWishlistMeta] = useState<WishlistMeta>({
    totalWishlists: 0,
    uniqueProducts: 0,
    uniqueCustomers: 0,
    updatedAt: '',
  });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadWishlistStats = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/wishlist-stats');
      if (res.ok) {
        const data = await res.json();
        setWishlistStats(data.products || []);
        setWishlistMeta({
          totalWishlists: data.totalWishlists ?? 0,
          uniqueProducts: data.uniqueProducts ?? 0,
          uniqueCustomers: data.uniqueCustomers ?? 0,
          updatedAt: data.updatedAt ?? '',
        });
      }
    } catch {
      console.error('Failed to load wishlist stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlistStats();
  }, []);

  return (
    <div className="mb-10">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Customer Wishlists</h2>
            <p className="text-zinc-400 text-sm max-w-2xl">
              See which logged-in customers saved which products. Use this for surprise freebies, restock alerts, and outreach.
            </p>
          </div>
          <button
            onClick={loadWishlistStats}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total saves</p>
            <p className="text-3xl font-bold text-[#00ff9d]">{wishlistMeta.totalWishlists}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Unique products</p>
            <p className="text-3xl font-bold">{wishlistMeta.uniqueProducts}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Customers</p>
            <p className="text-3xl font-bold">{wishlistMeta.uniqueCustomers}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Last updated</p>
            <p className="text-sm text-zinc-300">
              {wishlistMeta.updatedAt ? new Date(wishlistMeta.updatedAt).toLocaleString() : 'No data yet'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-20 text-zinc-400">Loading wishlist insights...</p>
      ) : wishlistStats.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-12 text-center">
          <p className="text-xl text-zinc-400 mb-2">No wishlist data yet</p>
          <p className="text-sm text-zinc-500">
            Stats appear when logged-in customers heart products on the shop.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {wishlistStats.map((item, index) => {
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className="w-full p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center text-left hover:bg-zinc-800/40 transition"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#00ff9d]/10 text-[#00ff9d] flex items-center justify-center font-bold flex-shrink-0">
                      #{index + 1}
                    </div>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-xl border border-zinc-700 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{item.name}</p>
                      <p className="text-xs text-zinc-500 capitalize mt-1">
                        {item.category || 'product'} · ID {item.id}
                        {item.price ? ` · $${item.price}` : ''}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Last wishlisted {new Date(item.lastWishlistedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-3xl font-bold text-[#00ff9d]">{item.count}</p>
                    <p className="text-xs text-zinc-500">{item.count === 1 ? 'customer' : 'customers'}</p>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-zinc-800 px-5 py-4 bg-black/30">
                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Who wishlisted this</p>
                    <div className="space-y-2">
                      {item.wishlisters.map((user) => (
                        <div
                          key={`${item.id}-${user.userId}`}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3"
                        >
                          <div>
                            <p className="font-medium text-sm">{user.name || 'Unnamed customer'}</p>
                            <p className="text-xs text-zinc-400">{user.email}</p>
                            <p className="text-[10px] text-zinc-600 mt-1">User ID {user.userId}</p>
                          </div>
                          <p className="text-xs text-zinc-500 shrink-0">
                            {new Date(user.wishlistedAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}