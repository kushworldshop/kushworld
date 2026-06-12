'use client';

import { useState, useEffect } from 'react';

const ADMIN_PASSWORD = "kushworld2026"; // Change this anytime you want

type AdminTab = 'orders' | 'promo' | 'products';

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
  category: string;
  hasOverride?: boolean;
  baseName?: string;
  basePrice?: number;
  baseImage?: string;
}

interface SiteSettings {
  referrerCommissionPercent: number;
  referrerRewardPoints: number;
  promoCustomerDiscount: number;
  promoFirstOrderOnly: boolean;
  promoMinOrder: number;
}

export default function AdminOrders() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>('orders');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [productEdits, setProductEdits] = useState<Record<string, Partial<AdminProduct>>>({});
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [productsMessage, setProductsMessage] = useState('');
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('adminAuthenticated') === 'true') {
      setAuthenticated(true);
      loadOrders();
      loadSettings();
      loadProducts();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      localStorage.setItem('adminAuthenticated', 'true');
      setAuthenticated(true);
      setError('');
      loadOrders();
      loadSettings();
      loadProducts();
    } else {
      setError('Incorrect password');
    }
  };

  const logout = () => {
    localStorage.removeItem('adminAuthenticated');
    setAuthenticated(false);
    setPasswordInput('');
  };

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error('Failed to load orders');
    }
    setLoading(false);
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'x-admin-password': ADMIN_PASSWORD },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (e) {
      console.error('Failed to load settings');
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/admin/products', {
        headers: { 'x-admin-password': ADMIN_PASSWORD },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminProducts(data.products || []);
      }
    } catch (e) {
      console.error('Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const getProductDraft = (product: AdminProduct) => ({
    name: productEdits[product.id]?.name ?? product.name,
    price: productEdits[product.id]?.price ?? product.price,
    image: productEdits[product.id]?.image ?? product.image,
    description: productEdits[product.id]?.description ?? product.description ?? '',
  });

  const updateProductDraft = (id: string, field: keyof AdminProduct, value: string | number) => {
    setProductEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveProduct = async (product: AdminProduct) => {
    const draft = getProductDraft(product);
    setSavingProductId(product.id);
    setProductsMessage('');
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': ADMIN_PASSWORD,
        },
        body: JSON.stringify({
          id: product.id,
          name: draft.name,
          price: draft.price,
          image: draft.image,
          description: draft.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProductsMessage(`Saved ${draft.name}`);
        setProductEdits((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
        await loadProducts();
      } else {
        setProductsMessage(data.error || 'Failed to save product');
      }
    } catch {
      setProductsMessage('Failed to save product');
    } finally {
      setSavingProductId(null);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': ADMIN_PASSWORD,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setSettingsMessage('Promo settings saved.');
      } else {
        setSettingsMessage(data.error || 'Failed to save');
      }
    } catch {
      setSettingsMessage('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      loadOrders();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const approveIdVerification = async (orderId: string) => {
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, idVerificationStatus: 'verified' }),
      });
      loadOrders();
    } catch (e) {
      alert('Failed to approve ID');
    }
  };

  const viewIdImage = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/id-image?orderId=${orderId}`, {
        headers: { 'x-admin-password': ADMIN_PASSWORD },
      });
      if (!res.ok) {
        alert('No ID image found for this order');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      alert('Failed to load ID image');
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
            onClick={() => setTab('promo')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'promo' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Promo & Commission
          </button>
          <button
            onClick={() => setTab('products')}
            className={`px-6 py-3 rounded-xl font-medium ${tab === 'products' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900'}`}
          >
            Products
          </button>
        </div>

        {tab === 'promo' && settings && (
          <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-10 max-w-2xl">
            <h2 className="text-2xl font-bold mb-2">Loyalty Promo Settings</h2>
            <p className="text-zinc-400 text-sm mb-8">
              Control what customers get when using a shared promo code, and what the code owner earns.
            </p>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-zinc-400 block mb-2">Referrer commission (% of order subtotal)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={settings.referrerCommissionPercent}
                  onChange={(e) => setSettings({ ...settings, referrerCommissionPercent: Number(e.target.value) })}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                />
                <p className="text-xs text-zinc-500 mt-1">Example: 5% on a $100 order = $5 commission</p>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">Loyalty points per promo use</label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={settings.referrerRewardPoints}
                  onChange={(e) => setSettings({ ...settings, referrerRewardPoints: Number(e.target.value) })}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">Customer discount ($ off when using promo code)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.promoCustomerDiscount}
                  onChange={(e) => setSettings({ ...settings, promoCustomerDiscount: Number(e.target.value) })}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">Minimum order for promo codes ($)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.promoMinOrder}
                  onChange={(e) => setSettings({ ...settings, promoMinOrder: Number(e.target.value) })}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.promoFirstOrderOnly}
                  onChange={(e) => setSettings({ ...settings, promoFirstOrderOnly: e.target.checked })}
                  className="w-4 h-4 accent-[#00ff9d]"
                />
                <span className="text-sm">First order only (promo codes work on first purchase)</span>
              </label>

              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Promo Settings'}
              </button>
              {settingsMessage && <p className="text-sm text-[#00ff9d]">{settingsMessage}</p>}
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div className="mb-10">
            <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
              <h2 className="text-2xl font-bold mb-2">Product Catalog</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Edit names, prices, image URLs, and descriptions. Changes go live immediately on the shop.
                Image paths usually look like <code className="text-[#00ff9d]">/products/your-image.jpg</code>
              </p>
              <div className="flex flex-wrap gap-4 mb-4">
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 min-w-[220px] bg-black border border-zinc-700 rounded-xl px-4 py-3"
                />
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="bg-black border border-zinc-700 rounded-xl px-4 py-3"
                >
                  <option value="all">All categories</option>
                  <option value="vapes">Vapes</option>
                  <option value="concentrates">Concentrates</option>
                  <option value="flower">Flower</option>
                  <option value="mushrooms">Mushrooms</option>
                  <option value="merch">Merch</option>
                </select>
              </div>
              {productsMessage && <p className="text-sm text-[#00ff9d] mb-4">{productsMessage}</p>}
            </div>

            {loadingProducts ? (
              <p className="text-center py-20 text-zinc-400">Loading products...</p>
            ) : (
              <div className="space-y-6">
                {adminProducts
                  .filter((product) => productCategory === 'all' || product.category === productCategory)
                  .filter((product) => {
                    const q = productSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      product.name.toLowerCase().includes(q) ||
                      product.id.includes(q) ||
                      product.category.toLowerCase().includes(q)
                    );
                  })
                  .map((product) => {
                    const draft = getProductDraft(product);
                    const dirty = !!productEdits[product.id];
                    return (
                      <div key={product.id} className="bg-zinc-900 border border-zinc-700 p-6 rounded-3xl">
                        <div className="flex flex-col lg:flex-row gap-6">
                          <img
                            src={draft.image}
                            alt={draft.name}
                            className="w-28 h-28 object-cover rounded-2xl border border-zinc-700"
                          />
                          <div className="flex-1 grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-zinc-500 block mb-1">Name</label>
                              <input
                                value={draft.name}
                                onChange={(e) => updateProductDraft(product.id, 'name', e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-zinc-500 block mb-1">Price ($)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={draft.price}
                                onChange={(e) => updateProductDraft(product.id, 'price', Number(e.target.value))}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs text-zinc-500 block mb-1">Image URL</label>
                              <input
                                value={draft.image}
                                onChange={(e) => updateProductDraft(product.id, 'image', e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs text-zinc-500 block mb-1">Description</label>
                              <textarea
                                value={draft.description}
                                onChange={(e) => updateProductDraft(product.id, 'description', e.target.value)}
                                rows={3}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-5 border-t border-zinc-800">
                          <div className="text-xs text-zinc-500">
                            ID: {product.id} · {product.category}
                            {product.hasOverride && <span className="text-[#00ff9d] ml-2">Customized</span>}
                          </div>
                          <button
                            onClick={() => saveProduct(product)}
                            disabled={savingProductId === product.id}
                            className="bg-[#00ff9d] text-black px-6 py-3 rounded-xl font-medium disabled:opacity-50"
                          >
                            {savingProductId === product.id ? 'Saving...' : dirty ? 'Save Changes' : 'Save'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {tab === 'orders' && loading ? (
          <p className="text-center py-20 text-xl text-zinc-400">Loading orders...</p>
        ) : tab === 'orders' && orders.length === 0 ? (
          <p className="text-center py-20 text-xl text-zinc-400">No orders placed yet.</p>
        ) : tab === 'orders' ? (
          <div className="space-y-10">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl">
                <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                  <div>
                    <div className="font-mono text-3xl text-[#00ff9d]">#{order.id}</div>
                    <div className="text-sm text-zinc-400 mt-2">
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">${order.subtotal?.toFixed(2) || '0.00'}</div>
                    <div className="text-sm uppercase tracking-widest text-zinc-400">{order.paymentMethod}</div>
                    {order.paymentStatus && (
                      <div className={`text-sm mt-1 ${order.paymentStatus === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                        Payment: {order.paymentStatus}
                      </div>
                    )}
                    {order.transactionId && (
                      <div className="text-xs text-zinc-500 mt-1 font-mono">Txn: {order.transactionId}</div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mb-10">
                  <button 
                    onClick={() => updateStatus(order.id, 'processing')}
                    className="flex-1 py-4 bg-yellow-600 hover:bg-yellow-700 rounded-2xl text-sm font-medium transition"
                  >
                    Mark as Processing
                  </button>
                  <button 
                    onClick={() => updateStatus(order.id, 'shipped')}
                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-sm font-medium transition"
                  >
                    Mark as Shipped
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="font-medium">{order.customer?.name || order.name}</p>
                    <p className="text-sm text-zinc-400">{order.customer?.email || order.email}</p>
                    <p className="text-sm text-zinc-400">{(order.customer?.phone || order.phone) && `Phone: ${order.customer?.phone || order.phone}`}</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      {order.customer?.address || order.address}, {order.customer?.city || order.city} {order.customer?.state || order.state} {order.customer?.zip || order.zip}
                    </p>
                    <p className="text-sm mt-2">
                      Status: <span className="text-[#00ff9d] uppercase">{order.status || 'pending'}</span>
                    </p>
                    {order.shippingMethod && (
                      <p className="text-sm mt-1 text-zinc-400">
                        Shipping: <span className="text-white">{order.shippingMethod}</span>
                      </p>
                    )}
                    {order.promoCode && (
                      <p className="text-sm mt-1 text-zinc-400">
                        Promo: <span className="text-[#00ff9d]">{order.promoCode}</span>
                        {order.referrerName && ` (by ${order.referrerName})`}
                      </p>
                    )}
                    <p className="text-sm mt-1">
                      ID Verification:{' '}
                      <span className={`uppercase font-medium ${
                        order.idVerification?.status === 'verified' ? 'text-green-400' :
                        order.idVerification?.status === 'uploaded' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {order.idVerification?.status || 'required'}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {order.idVerification?.status === 'uploaded' && (
                      <>
                        <button
                          onClick={() => viewIdImage(order.id)}
                          className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm transition"
                        >
                          View ID Photo
                        </button>
                        <button
                          onClick={() => approveIdVerification(order.id)}
                          className="px-5 py-3 bg-[#00ff9d] text-black hover:bg-[#00ff9d]/90 rounded-xl text-sm font-medium transition"
                        >
                          Approve ID (21+)
                        </button>
                      </>
                    )}
                    {order.idVerification?.status === 'required' && (
                      <p className="text-sm text-red-400">Waiting for customer to upload ID</p>
                    )}
                    {order.idVerification?.status === 'verified' && (
                      <p className="text-sm text-green-400">Customer ID verified</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4 bg-black p-5 rounded-2xl items-start">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-20 h-20 object-cover rounded-xl flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium leading-tight">{item.name}</p>
                          {item.selectedSize && <p className="text-xs text-zinc-400 mt-1">Size: {item.selectedSize}</p>}
                          <p className="text-xs text-zinc-400">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}