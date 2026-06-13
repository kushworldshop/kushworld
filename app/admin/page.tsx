'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { mergeSiteFeatures } from '@/lib/featureTypes';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/siteContentTypes';
import SiteContentTab from '@/app/admin/components/SiteContentTab';
import FeaturesTab from '@/app/admin/components/FeaturesTab';
import OrderShippingControls from '@/app/admin/components/OrderShippingControls';
import CustomersTab from '@/app/admin/components/CustomersTab';
import ProductsTab from '@/app/admin/components/ProductsTab';
import { formatCartItemOptions } from '@/lib/productOptions';

type AdminTab = 'orders' | 'products' | 'wishlist' | 'site' | 'features' | 'customers';

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
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>('orders');
  const [wishlistStats, setWishlistStats] = useState<WishlistStat[]>([]);
  const [wishlistMeta, setWishlistMeta] = useState({ totalWishlists: 0, uniqueProducts: 0, updatedAt: '' });
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  const bootstrapAdmin = () => {
    loadOrders();
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

        {tab === 'products' && <ProductsTab />}

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
                    {order.shippingNotificationSentAt && (
                      <p className="text-xs mt-1 text-emerald-400">
                        Shipping email sent {new Date(order.shippingNotificationSentAt).toLocaleString()}
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