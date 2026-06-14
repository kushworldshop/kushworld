'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { mergeSiteFeatures } from '@/lib/featureTypes';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/siteContentTypes';
import SiteContentTab from '@/app/admin/components/SiteContentTab';
import FeaturesTab from '@/app/admin/components/FeaturesTab';
import CustomersTab from '@/app/admin/components/CustomersTab';
import OrdersTab from '@/app/admin/components/OrdersTab';
import ProductsTab from '@/app/admin/components/ProductsTab';
import SpinWheelTab from '@/app/admin/components/SpinWheelTab';

type AdminTab = 'orders' | 'products' | 'wishlist' | 'wheel' | 'site' | 'features' | 'customers';

interface WishlistStat {
  id: string;
  name: string;
  image: string;
  category?: string;
  count: number;
  lastWishlistedAt: string;
}

export default function AdminOrders() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>('orders');
  const [wishlistStats, setWishlistStats] = useState<WishlistStat[]>([]);
  const [wishlistMeta, setWishlistMeta] = useState({ totalWishlists: 0, uniqueProducts: 0, updatedAt: '' });
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  const bootstrapAdmin = () => {
    loadWishlistStats();
    loadSiteContent();
    setLoading(false);
  };

  useEffect(() => {
    adminFetch('/api/admin/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthenticated(true);
          bootstrapAdmin();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogin = async () => {
    setError('');
    try {
      const res = await adminFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Incorrect password');
        return;
      }
      setAuthenticated(true);
      setError('');
      bootstrapAdmin();
    } catch {
      setError('Login failed');
    }
  };

  const logout = async () => {
    await adminFetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    setPasswordInput('');
  };

  const loadSiteContent = async () => {
    try {
      const res = await adminFetch('/api/admin/site-content');
      if (res.ok) {
        const data = await res.json();
        setSiteContent({
          ...DEFAULT_SITE_CONTENT,
          ...(data.content || {}),
          features: mergeSiteFeatures(data.content?.features),
        });
      }
    } catch (e) {
      console.error('Failed to load site content');
    }
  };

  const loadWishlistStats = async () => {
    setLoadingWishlist(true);
    try {
      const res = await adminFetch('/api/admin/wishlist-stats');
      if (res.ok) {
        const data = await res.json();
        setWishlistStats(data.products || []);
        setWishlistMeta({
          totalWishlists: data.totalWishlists ?? 0,
          uniqueProducts: data.uniqueProducts ?? 0,
          updatedAt: data.updatedAt ?? '',
        });
      }
    } catch (e) {
      console.error('Failed to load wishlist stats');
    } finally {
      setLoadingWishlist(false);
    }
  };

  // Login Screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md text-center border border-zinc-700">
          <h1 className="text-4xl font-bold mb-8 text-[#00ff9d]">KushWorld Admin</h1>
          
          <input
            type="password"
            placeholder="Enter Admin Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full bg-black border border-zinc-700 p-5 rounded-2xl text-lg mb-6 focus:outline-none focus:border-[#00ff9d]"
          />

          <button
            onClick={handleLogin}
            className="w-full bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black py-5 rounded-2xl font-bold text-xl transition"
          >
            Login to Admin Panel
          </button>

          {error && <p className="text-red-500 mt-6 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold">KushWorld Admin</h1>
          <button 
            onClick={logout}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-medium transition"
          >
            Logout
          </button>
        </div>

        <div className="flex gap-3 mb-10">
          <button
            onClick={() => setTab('orders')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'orders' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Orders
          </button>
          <button
            onClick={() => setTab('products')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'products' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Products
          </button>
          <button
            onClick={() => { setTab('wishlist'); loadWishlistStats(); }}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'wishlist' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Wishlist Insights
          </button>
          <button
            onClick={() => setTab('wheel')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'wheel' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Wheel Wins
          </button>
          <button
            onClick={() => { setTab('site'); loadSiteContent(); }}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'site' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Site Content
          </button>
          <button
            onClick={() => { setTab('features'); loadSiteContent(); }}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'features' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Features
          </button>
          <button
            onClick={() => setTab('customers')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'customers' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Members
          </button>
        </div>

        {tab === 'site' && (
          <SiteContentTab content={siteContent} onContentChange={setSiteContent} />
        )}

        {tab === 'features' && (
          <FeaturesTab content={siteContent} onContentChange={setSiteContent} />
        )}

        {tab === 'customers' && <CustomersTab />}

        {tab === 'products' && <ProductsTab />}

        {tab === 'wheel' && <SpinWheelTab />}

        {tab === 'wishlist' && (
          <div className="mb-10">
            <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Popular Wishlist Items</h2>
                  <p className="text-zinc-400 text-sm max-w-2xl">
                    See what customers are saving for later. Use this to pick surprise freebies to include in orders.
                  </p>
                </div>
                <button
                  onClick={loadWishlistStats}
                  disabled={loadingWishlist}
                  className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {loadingWishlist ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-black rounded-2xl p-5 border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total wishlists</p>
                  <p className="text-3xl font-bold text-[#00ff9d]">{wishlistMeta.totalWishlists}</p>
                </div>
                <div className="bg-black rounded-2xl p-5 border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Unique products</p>
                  <p className="text-3xl font-bold">{wishlistMeta.uniqueProducts}</p>
                </div>
                <div className="bg-black rounded-2xl p-5 border border-zinc-800">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Last updated</p>
                  <p className="text-sm text-zinc-300">
                    {wishlistMeta.updatedAt
                      ? new Date(wishlistMeta.updatedAt).toLocaleString()
                      : 'No data yet'}
                  </p>
                </div>
              </div>
            </div>

            {loadingWishlist ? (
              <p className="text-center py-20 text-zinc-400">Loading wishlist insights...</p>
            ) : wishlistStats.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-12 text-center">
                <p className="text-xl text-zinc-400 mb-2">No wishlist data yet</p>
                <p className="text-sm text-zinc-500">
                  Stats appear when customers heart products on the shop. New adds are tracked from now on.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {wishlistStats.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
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
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Last wishlisted {new Date(item.lastWishlistedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-3xl font-bold text-[#00ff9d]">{item.count}</p>
                      <p className="text-xs text-zinc-500">wishlists</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'orders' && <OrdersTab />}
      </div>
    </div>
  );
}