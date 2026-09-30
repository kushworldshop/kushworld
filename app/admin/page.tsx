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
import StaffTab from '@/app/admin/components/StaffTab';
import type { StaffPermission, StaffRole } from '@/lib/adminPermissions';


type AdminTab =
  | 'orders'
  | 'members'
  | 'products'
  | 'wheel'
  | 'wishlist'
  | 'carts'
  | 'social'
  | 'subscriptions'
  | 'settings'
  | 'staff';

const ADMIN_TABS: Array<{ id: AdminTab; label: string; permission?: StaffPermission; ownerOnly?: boolean }> = [
  { id: 'orders', label: 'Orders', permission: 'orders' },
  { id: 'members', label: 'Members', permission: 'members' },
  { id: 'products', label: 'Products', permission: 'products' },
  { id: 'carts', label: 'Carts', permission: 'carts' },
  { id: 'wishlist', label: 'Wishlist', permission: 'wishlist' },
  { id: 'social', label: 'X / TD', permission: 'social' },
  { id: 'wheel', label: 'Wheel', permission: 'wheel' },
  { id: 'subscriptions', label: 'Subs', permission: 'subscriptions' },
  { id: 'settings', label: 'Settings', permission: 'settings' },
  { id: 'staff', label: 'Staff', ownerOnly: true },
];

export default function AdminOrders() {
  const [authenticated, setAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>('orders');
  const [role, setRole] = useState<StaffRole>('owner');
  const [staffName, setStaffName] = useState('Owner');
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
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
          setRole(data.role || 'owner');
          setStaffName(data.name || 'Owner');
          const nextRole = data.role || 'owner';
          const nextPermissions = Array.isArray(data.permissions) ? data.permissions : [];
          setPermissions(nextPermissions);
          setTab(firstAllowedTab(nextRole, nextPermissions));
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
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Incorrect name, email, or passcode');
        return;
      }
      setAuthenticated(true);
      setRole(data.role || 'owner');
      setStaffName(data.name || 'Owner');
      const nextRole = data.role || 'owner';
      const nextPermissions = Array.isArray(data.permissions) ? data.permissions : [];
      setPermissions(nextPermissions);
      setTab(firstAllowedTab(nextRole, nextPermissions));
      setError('');
      bootstrapAdmin();
    } catch {
      setError('Login failed');
    }
  };

  const logout = async () => {
    await adminFetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    setUsernameInput('');
    setPasswordInput('');
    setRole('owner');
    setPermissions([]);
  };

  const can = (permission: StaffPermission, nextRole = role, nextPermissions = permissions) =>
    nextRole === 'owner' || nextRole === 'admin' || nextPermissions.includes(permission);

  const firstAllowedTab = (nextRole: StaffRole, nextPermissions: StaffPermission[]): AdminTab => {
    const tabs: Array<[AdminTab, StaffPermission]> = [
      ['orders', 'orders'],
      ['products', 'products'],
      ['members', 'members'],
      ['carts', 'carts'],
      ['wishlist', 'wishlist'],
      ['social', 'social'],
      ['wheel', 'wheel'],
      ['subscriptions', 'subscriptions'],
      ['settings', 'settings'],
    ];
    for (const [nextTab, permission] of tabs) {
      if (can(permission, nextRole, nextPermissions)) return nextTab;
    }
    return nextRole === 'owner' ? 'staff' : 'orders';
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
            type="text"
            autoComplete="username"
            placeholder="Login name or email (owner leave blank)"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full bg-black border border-zinc-700 p-5 rounded-2xl text-lg mb-4 focus:outline-none focus:border-[#00ff9d]"
          />
          
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Passcode or account password"
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

  const roleLabel = role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Mod';
  const visibleTabs = ADMIN_TABS.filter((item) =>
    item.ownerOnly ? role === 'owner' : !item.permission || can(item.permission)
  );

  return (
    <div className="h-dvh bg-black text-white flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2">
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight">
              KushWorld <span className="text-[#00ff9d]">Admin</span>
            </p>
            <p className="text-[11px] text-zinc-500 truncate">
              {staffName} · {roleLabel}
            </p>
          </div>
          <button
            onClick={logout}
            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 sm:px-3 pb-2">
          {visibleTabs.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                if (item.id === 'settings') loadSiteContent();
              }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab === item.id ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className={`flex-1 min-h-0 ${tab === 'members' ? 'overflow-hidden' : 'overflow-y-auto p-4 lg:p-6'}`}>
        {tab === 'settings' && can('settings') && (
          <div className="max-w-7xl mx-auto space-y-12">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Step 1 — Feature toggles</p>
              <FeaturesTab content={siteContent} onContentChange={setSiteContent} />
            </div>
            <div className="border-t border-zinc-800 pt-10">
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Step 2 — Copy &amp; content</p>
              <SiteContentTab content={siteContent} onContentChange={setSiteContent} />
            </div>
          </div>
        )}

        {tab === 'subscriptions' && can('subscriptions') && (
          <div className="max-w-7xl mx-auto">
            <SubscriptionsTab featureEnabled={siteContent.features.subscriptions?.enabled ?? false} />
          </div>
        )}

        {tab === 'members' && can('members') && <CustomersTab canManageStaff={role === 'owner'} />}

        {tab === 'products' && can('products') && (
          <div className="max-w-7xl mx-auto">
            <ProductsTab canDeleteProducts={can('productsDelete')} />
          </div>
        )}
        {tab === 'staff' && role === 'owner' && (
          <div className="max-w-7xl mx-auto">
            <StaffTab />
          </div>
        )}

        {tab === 'wheel' && can('wheel') && (
          <div className="max-w-7xl mx-auto">
            <SpinWheelTab />
          </div>
        )}

        {tab === 'wishlist' && can('wishlist') && (
          <div className="max-w-7xl mx-auto">
            <WishlistTab />
          </div>
        )}

        {tab === 'carts' && can('carts') && (
          <div className="max-w-7xl mx-auto">
            <CartsTab />
          </div>
        )}

        {tab === 'social' && can('social') && (
          <div className="max-w-7xl mx-auto">
            <SocialRewardsTab />
          </div>
        )}

        {tab === 'orders' && can('orders') && (
          <div className="max-w-7xl mx-auto">
            <OrdersTab />
          </div>
        )}
      </main>
    </div>
  );
}