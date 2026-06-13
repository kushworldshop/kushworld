'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { mergeSiteFeatures } from '@/lib/featureTypes';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/siteContentTypes';
import SiteContentTab from '@/app/admin/components/SiteContentTab';
import FeaturesTab from '@/app/admin/components/FeaturesTab';
import OrderShippingControls from '@/app/admin/components/OrderShippingControls';
import CustomersTab from '@/app/admin/components/CustomersTab';
import ProductOptionsEditor from '@/app/admin/components/ProductOptionsEditor';
import { formatCartItemOptions, getProductOptionGroups, type ProductOptionGroup } from '@/lib/productOptions';
import { getAllProductCategorySlugs, getSubsectionsForProductCategory } from '@/lib/shopNavigation';
import { formatCurrency, formatPercent, getProductMargin } from '@/lib/productEconomics';

type AdminTab = 'orders' | 'products' | 'wishlist' | 'site' | 'features' | 'customers';

interface WishlistStat {
  id: string;
  name: string;
  image: string;
  category?: string;
  count: number;
  lastWishlistedAt: string;
}

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  cost?: number;
  inventory?: number;
  image: string;
  description?: string;
  category: string;
  subcategory?: string;
  optionGroups?: ProductOptionGroup[];
  sizes?: string[];
  colors?: string[];
  hidden?: boolean;
  compareAtPrice?: number;
  featured?: boolean;
  bestSeller?: boolean;
  isNew?: boolean;
  hasOverride?: boolean;
  baseName?: string;
  basePrice?: number;
  baseImage?: string;
}

export default function AdminOrders() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>('orders');
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [productEdits, setProductEdits] = useState<
    Record<string, Partial<AdminProduct> & { trackInventory?: boolean }>
  >({});
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [productVisibilityFilter, setProductVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [productsMessage, setProductsMessage] = useState('');
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [wishlistStats, setWishlistStats] = useState<WishlistStat[]>([]);
  const [wishlistMeta, setWishlistMeta] = useState({ totalWishlists: 0, uniqueProducts: 0, updatedAt: '' });
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  const bootstrapAdmin = () => {
    loadOrders();
    loadProducts();
    loadWishlistStats();
    loadSiteContent();
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

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await adminFetch('/api/admin/products');
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

  const getProductDraft = (product: AdminProduct) => {
    const edits = productEdits[product.id];
    const trackInventory =
      edits?.trackInventory !== undefined
        ? edits.trackInventory
        : product.inventory !== undefined;
    return {
    name: edits?.name ?? product.name,
    price: edits?.price ?? product.price,
    cost: edits?.cost ?? product.cost ?? 0,
    trackInventory,
    inventory: edits?.inventory ?? product.inventory ?? 0,
    image: edits?.image ?? product.image,
    description: productEdits[product.id]?.description ?? product.description ?? '',
    category: productEdits[product.id]?.category ?? product.category,
    subcategory: productEdits[product.id]?.subcategory ?? product.subcategory ?? '',
    optionGroups:
      edits?.optionGroups ??
      product.optionGroups ??
      getProductOptionGroups(product),
    compareAtPrice: edits?.compareAtPrice ?? product.compareAtPrice ?? 0,
    featured: edits?.featured ?? product.featured ?? false,
    bestSeller: edits?.bestSeller ?? product.bestSeller ?? false,
    isNew: edits?.isNew ?? product.isNew ?? false,
  };
  };

  const updateProductDraft = (
    id: string,
    field: keyof AdminProduct | 'trackInventory',
    value: string | number | boolean | ProductOptionGroup[]
  ) => {
    setProductEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
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

  const uploadProductImage = async (product: AdminProduct, file: File) => {
    setUploadingImageId(product.id);
    setProductsMessage('');
    try {
      const formData = new FormData();
      formData.append('productId', product.id);
      formData.append('image', file);

      const res = await adminFetch('/api/admin/products/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setProductsMessage(`Image uploaded for ${product.name}`);
        setProductEdits((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
        await loadProducts();
      } else {
        setProductsMessage(data.error || 'Failed to upload image');
      }
    } catch {
      setProductsMessage('Failed to upload image');
    } finally {
      setUploadingImageId(null);
    }
  };

  const toggleProductVisibility = async (product: AdminProduct) => {
    const nextHidden = !product.hidden;
    setTogglingVisibilityId(product.id);
    setProductsMessage('');
    try {
      const res = await adminFetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, hidden: nextHidden }),
      });
      const data = await res.json();
      if (data.success) {
        setProductsMessage(nextHidden ? `Hidden ${product.name}` : `Unhidden ${product.name}`);
        await loadProducts();
      } else {
        setProductsMessage(data.error || 'Failed to update visibility');
      }
    } catch {
      setProductsMessage('Failed to update visibility');
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  const saveProduct = async (product: AdminProduct) => {
    const draft = getProductDraft(product);
    setSavingProductId(product.id);
    setProductsMessage('');
    try {
      const res = await adminFetch('/api/admin/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: product.id,
          name: draft.name,
          price: draft.price,
          cost: draft.cost,
          trackInventory: draft.trackInventory,
          inventory: draft.trackInventory ? draft.inventory : undefined,
          image: draft.image,
          description: draft.description,
          optionGroups: draft.optionGroups,
          category: draft.category,
          subcategory: draft.subcategory,
          compareAtPrice: draft.compareAtPrice > 0 ? draft.compareAtPrice : 0,
          featured: draft.featured,
          bestSeller: draft.bestSeller,
          isNew: draft.isNew,
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

  const approveOrderAction = async (orderId: string, action: 'cancel' | 'refund') => {
    const label = action === 'cancel' ? 'cancel this order and restore inventory' : 'refund this order and restore inventory';
    if (!confirm(`Approve ${label}?`)) return;

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId,
          approveCancel: action === 'cancel',
          approveRefund: action === 'refund',
        }),
      });
      const data = await res.json();
      if (data.success) {
        loadOrders();
      } else {
        alert(data.error || 'Failed to update order');
      }
    } catch {
      alert('Failed to update order');
    }
  };

  const confirmBtcPayment = async (orderId: string) => {
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, paymentStatus: 'paid' }),
      });
      loadOrders();
    } catch (e) {
      alert('Failed to confirm Bitcoin payment');
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
      const res = await adminFetch(`/api/admin/id-image?orderId=${orderId}`);
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

        {tab === 'products' && (
          <div className="mb-10">
            <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
              <h2 className="text-2xl font-bold mb-2">Product Catalog</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Edit sell price, cost, inventory, images, descriptions, and options. Cost is admin-only and helps
                track margins. Inventory subtracts on purchase and restores when you approve a cancel or refund.
                Hide products to remove them from the shop without deleting them.
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
                  <option value="vaporizers">Vaporizers</option>
                  <option value="concentrates">Concentrates</option>
                  <option value="flower">Flower</option>
                  <option value="edibles">Edibles</option>
                  <option value="pre-rolls">Pre Rolls</option>
                  <option value="accessories">Accessories</option>
                  <option value="mushrooms">Mushrooms</option>
                  <option value="merch">Merch</option>
                </select>
                <select
                  value={productVisibilityFilter}
                  onChange={(e) => setProductVisibilityFilter(e.target.value as 'all' | 'visible' | 'hidden')}
                  className="bg-black border border-zinc-700 rounded-xl px-4 py-3"
                >
                  <option value="all">All visibility</option>
                  <option value="visible">Visible only</option>
                  <option value="hidden">Hidden only</option>
                </select>
              </div>
              {productsMessage && <p className="text-sm text-[#00ff9d] mb-4">{productsMessage}</p>}
            </div>

            {loadingProducts ? (
              <p className="text-center py-20 text-zinc-400">Loading products...</p>
            ) : (
              <div className="space-y-6">
                {adminProducts
                  .filter((product) => {
                    if (productCategory === 'all') return true;
                    if (productCategory === 'merch') return product.category === 'merch';
                    if (productCategory === 'vaporizers') return product.category === 'vapes';
                    return product.category === productCategory;
                  })
                  .filter((product) => {
                    if (productVisibilityFilter === 'visible') return !product.hidden;
                    if (productVisibilityFilter === 'hidden') return product.hidden;
                    return true;
                  })
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
                    const margin = getProductMargin(draft.price, draft.cost > 0 ? draft.cost : undefined);
                    return (
                      <div
                        key={product.id}
                        className={`bg-zinc-900 border p-6 rounded-3xl ${
                          product.hidden ? 'border-zinc-800 opacity-70' : 'border-zinc-700'
                        }`}
                      >
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
                              <label className="text-xs text-zinc-500 block mb-1">Sell price ($)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={draft.price}
                                onChange={(e) => updateProductDraft(product.id, 'price', Number(e.target.value))}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                              />
                              <p className="text-[11px] text-zinc-500 mt-1">Customer-facing shop price</p>
                            </div>
                            <div>
                              <label className="text-xs text-zinc-500 block mb-1">Cost ($)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={draft.cost}
                                onChange={(e) => updateProductDraft(product.id, 'cost', Number(e.target.value))}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                              />
                              <p className="text-[11px] text-zinc-500 mt-1">Your cost — admin only, never shown on shop</p>
                            </div>
                            <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3">
                              <label className="flex items-center gap-3 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={draft.trackInventory}
                                  onChange={(e) => updateProductDraft(product.id, 'trackInventory', e.target.checked)}
                                  className="w-4 h-4 accent-[#00ff9d]"
                                />
                                <span>Track inventory for this product</span>
                              </label>
                              {draft.trackInventory && (
                                <div className="mt-3 flex flex-wrap items-end gap-4">
                                  <div>
                                    <label className="text-xs text-zinc-500 block mb-1">Stock count</label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={draft.inventory}
                                      onChange={(e) => updateProductDraft(product.id, 'inventory', Number(e.target.value))}
                                      className="w-32 bg-black border border-zinc-700 rounded-xl px-4 py-3"
                                    />
                                  </div>
                                  {draft.inventory <= 5 && (
                                    <p className={`text-sm ${draft.inventory === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                      {draft.inventory === 0 ? 'Out of stock on shop' : 'Low stock'}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            {margin && (
                              <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm">
                                <p className="text-zinc-400">
                                  Margin:{' '}
                                  <span className={margin.profit >= 0 ? 'text-[#00ff9d]' : 'text-red-400'}>
                                    {formatCurrency(margin.profit)} profit
                                  </span>{' '}
                                  · {formatPercent(margin.marginPercent)} margin · {formatPercent(margin.markupPercent)}{' '}
                                  markup
                                </p>
                              </div>
                            )}
                            <div>
                              <label className="text-xs text-zinc-500 block mb-1">Product category</label>
                              <select
                                value={draft.category}
                                onChange={(e) => updateProductDraft(product.id, 'category', e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                              >
                                {getAllProductCategorySlugs(siteContent.shopNavigation).map((slug) => (
                                  <option key={slug} value={slug}>
                                    {slug}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-zinc-500 block mb-1">Sub-section</label>
                              <select
                                value={draft.subcategory}
                                onChange={(e) => updateProductDraft(product.id, 'subcategory', e.target.value)}
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                              >
                                <option value="">None</option>
                                {getSubsectionsForProductCategory(siteContent.shopNavigation, draft.category).map(
                                  (subsection) => (
                                    <option key={subsection.id} value={subsection.id}>
                                      {subsection.label}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs text-zinc-500 block mb-1">Product Image</label>
                              <input
                                value={draft.image}
                                onChange={(e) => updateProductDraft(product.id, 'image', e.target.value)}
                                placeholder="/products/uploads/your-image.jpg"
                                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 mb-3"
                              />
                              <div className="flex flex-wrap items-center gap-3">
                                <label className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer">
                                  {uploadingImageId === product.id ? 'Uploading...' : 'Choose Image'}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="hidden"
                                    disabled={uploadingImageId === product.id}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) uploadProductImage(product, file);
                                      e.target.value = '';
                                    }}
                                  />
                                </label>
                                <span className="text-xs text-zinc-500">JPG, PNG, WEBP, or GIF · max 5MB</span>
                              </div>
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
                            <ProductOptionsEditor
                              value={draft.optionGroups}
                              onChange={(groups) => updateProductDraft(product.id, 'optionGroups', groups)}
                            />
                            <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-zinc-500 block mb-1">Compare-at price ($)</label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={draft.compareAtPrice}
                                  onChange={(e) => updateProductDraft(product.id, 'compareAtPrice', Number(e.target.value))}
                                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                                />
                                <p className="text-[11px] text-zinc-500 mt-1">Set higher than sell price to show as on sale</p>
                              </div>
                              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 space-y-3">
                                <label className="flex items-center gap-3 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={draft.featured}
                                    onChange={(e) => updateProductDraft(product.id, 'featured', e.target.checked)}
                                    className="w-4 h-4 accent-[#00ff9d]"
                                  />
                                  <span>Featured product</span>
                                </label>
                                <label className="flex items-center gap-3 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={draft.bestSeller}
                                    onChange={(e) => updateProductDraft(product.id, 'bestSeller', e.target.checked)}
                                    className="w-4 h-4 accent-[#00ff9d]"
                                  />
                                  <span>Best seller</span>
                                </label>
                                <label className="flex items-center gap-3 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={draft.isNew}
                                    onChange={(e) => updateProductDraft(product.id, 'isNew', e.target.checked)}
                                    className="w-4 h-4 accent-[#00ff9d]"
                                  />
                                  <span>New arrival</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-5 border-t border-zinc-800">
                          <div className="text-xs text-zinc-500">
                            ID: {product.id} · {product.category}
                            {product.cost && product.cost > 0 && (
                              <span className="text-zinc-400 ml-2">
                                Cost {formatCurrency(product.cost)} → Sell {formatCurrency(product.price)}
                              </span>
                            )}
                            {product.inventory !== undefined && (
                              <span className={`ml-2 ${product.inventory === 0 ? 'text-red-400' : product.inventory <= 5 ? 'text-amber-400' : 'text-zinc-400'}`}>
                                Stock: {product.inventory}
                              </span>
                            )}
                            {product.hidden && <span className="text-amber-400 ml-2">Hidden from shop</span>}
                            {product.hasOverride && <span className="text-[#00ff9d] ml-2">Customized</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => toggleProductVisibility(product)}
                              disabled={togglingVisibilityId === product.id}
                              className={`px-6 py-3 rounded-xl font-medium disabled:opacity-50 ${
                                product.hidden
                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                                  : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                              }`}
                            >
                              {togglingVisibilityId === product.id
                                ? 'Updating...'
                                : product.hidden
                                  ? 'Unhide Product'
                                  : 'Hide Product'}
                            </button>
                            <button
                              onClick={() => saveProduct(product)}
                              disabled={savingProductId === product.id}
                              className="bg-[#00ff9d] text-black px-6 py-3 rounded-xl font-medium disabled:opacity-50"
                            >
                              {savingProductId === product.id ? 'Saving...' : dirty ? 'Save Changes' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

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
                    <div className="text-2xl font-bold">${order.total?.toFixed(2) || order.subtotal?.toFixed(2) || '0.00'}</div>
                    <div className="text-sm uppercase tracking-widest text-zinc-400">{order.paymentMethod}</div>
                    {order.btcPayment?.amountBtc && (
                      <div className="text-xs text-zinc-500 mt-1 font-mono">
                        {order.btcPayment.amountBtc.toFixed(8)} BTC
                      </div>
                    )}
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

                <div className="flex flex-wrap gap-4 mb-10">
                  {order.paymentMethod === 'btc' && order.paymentStatus === 'awaiting_btc' && (
                    <button
                      onClick={() => confirmBtcPayment(order.id)}
                      className="flex-1 min-w-[200px] py-4 bg-orange-500 hover:bg-orange-600 rounded-2xl text-sm font-medium transition"
                    >
                      Confirm BTC Payment
                    </button>
                  )}
                  <button 
                    onClick={() => updateStatus(order.id, 'processing')}
                    className="flex-1 py-4 bg-yellow-600 hover:bg-yellow-700 rounded-2xl text-sm font-medium transition"
                  >
                    Mark as Processing
                  </button>

                  {order.inventoryDeducted && !order.inventoryRestored && order.status !== 'cancelled' && order.status !== 'refunded' && (
                    <>
                      <button
                        onClick={() => approveOrderAction(order.id, 'cancel')}
                        className="flex-1 min-w-[200px] py-4 bg-red-700 hover:bg-red-800 rounded-2xl text-sm font-medium transition"
                      >
                        Approve Cancel & Restore Stock
                      </button>
                      <button
                        onClick={() => approveOrderAction(order.id, 'refund')}
                        className="flex-1 min-w-[200px] py-4 bg-rose-700 hover:bg-rose-800 rounded-2xl text-sm font-medium transition"
                      >
                        Approve Refund & Restore Stock
                      </button>
                    </>
                  )}
                  {order.inventoryRestored && (
                    <p className="w-full text-sm text-emerald-400">
                      Inventory restored
                      {order.inventoryRestoredAt && ` · ${new Date(order.inventoryRestoredAt).toLocaleString()}`}
                    </p>
                  )}
                </div>

                <OrderShippingControls order={order} onUpdated={loadOrders} />

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
                    {order.trackingNumber && (
                      <p className="text-sm mt-1 text-zinc-400">
                        Tracking:{' '}
                        <span className="font-mono text-white">{order.trackingNumber}</span>
                        {order.trackingCarrier && (
                          <span className="text-zinc-500"> ({order.trackingCarrier})</span>
                        )}
                      </p>
                    )}
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
                          {formatCartItemOptions(item) && (
                            <p className="text-xs text-zinc-400 mt-1">{formatCartItemOptions(item)}</p>
                          )}
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