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
import SubscriptionsTab from '@/app/admin/components/SubscriptionsTab';
import WishlistTab from '@/app/admin/components/WishlistTab';
import CartsTab from '@/app/admin/components/CartsTab';
import SocialRewardsTab from '@/app/admin/components/SocialRewardsTab';


type AdminTab = 'orders' | 'members' | 'products' | 'wheel' | 'wishlist' | 'carts' | 'social' | 'subscriptions' | 'settings';

export default function AdminOrders() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>('orders');
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const bootstrapAdmin = () => {
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

        <div className="flex flex-wrap gap-3 mb-10">
          <button
            onClick={() => setTab('orders')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'orders' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Orders
          </button>
          <button
            onClick={() => setTab('members')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'members' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Members
          </button>
          <button
            onClick={() => setTab('products')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'products' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Products
          </button>
          <button
            onClick={() => setTab('wheel')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'wheel' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Wheel Wins
          </button>
          <button
            onClick={() => setTab('wishlist')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'wishlist' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Wishlist
          </button>
          <button
            onClick={() => setTab('carts')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'carts' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Live Carts
          </button>
          <button
            onClick={() => setTab('social')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'social' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            X Rewards
          </button>
          <button
            onClick={() => setTab('subscriptions')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'subscriptions' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Subscriptions
          </button>
          <button
            onClick={() => { setTab('settings'); loadSiteContent(); }}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'settings' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Site Settings
          </button>
        </div>

        {tab === 'settings' && (
          <div className="space-y-16">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Step 1 — Feature toggles</p>
              <FeaturesTab content={siteContent} onContentChange={setSiteContent} />
            </div>
            <div className="border-t border-zinc-800 pt-12">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-6">Step 2 — Copy &amp; content</p>
              <SiteContentTab content={siteContent} onContentChange={setSiteContent} />
            </div>
          </div>
        )}

        {tab === 'subscriptions' && (
          <SubscriptionsTab featureEnabled={siteContent.features.subscriptions?.enabled ?? false} />
        )}

        {tab === 'members' && <CustomersTab />}

        {tab === 'products' && <ProductsTab />}

        {tab === 'wheel' && <SpinWheelTab />}

        {tab === 'wishlist' && <WishlistTab />}

        {tab === 'carts' && <CartsTab />}

        {tab === 'social' && <SocialRewardsTab />}

        {tab === 'orders' && <OrdersTab />}
      </div>
    </div>
  );
}