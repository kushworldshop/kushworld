'use client';

import { useEffect, useMemo, useState } from 'react';
import OrderShippingControls from '@/app/admin/components/OrderShippingControls';
import { adminFetch } from '@/lib/adminClient';
import {
  ADMIN_ORDER_BUCKETS,
  getAdminOrderBucket,
  groupOrdersByBucket,
  type AdminOrderBucket,
} from '@/lib/adminOrderBuckets';
import { formatCartItemOptions } from '@/lib/productOptions';
import { getSuggestedNextStatus, getSuggestedNextLabel } from '@/lib/orderTracker';

export default function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState<AdminOrderBucket>('new');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Manual order creation for adding to user accounts
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createAddress, setCreateAddress] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createState, setCreateState] = useState('');
  const [createZip, setCreateZip] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createItems, setCreateItems] = useState<any[]>([{ name: '', quantity: 1, price: 0 }]);
  const [createStatus, setCreateStatus] = useState('confirmed');
  const [createPaymentStatus, setCreatePaymentStatus] = useState('paid');
  const [createFreeEighth, setCreateFreeEighth] = useState(false);
  const [createTrackingNumber, setCreateTrackingNumber] = useState('');
  const [createTrackingCarrier, setCreateTrackingCarrier] = useState('usps');
  const [creating, setCreating] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch {
      console.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const grouped = useMemo(() => groupOrdersByBucket(orders), [orders]);

  const filteredInBucket = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grouped[bucket].filter((order) => {
      if (!q) return true;
      return (
        String(order.id).toLowerCase().includes(q) ||
        String(order.customer?.email || order.email || '').toLowerCase().includes(q) ||
        String(order.customer?.name || order.name || '').toLowerCase().includes(q)
      );
    });
  }, [grouped, bucket, search]);

  useEffect(() => {
    if (filteredInBucket.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!filteredInBucket.some((order) => order.id === selectedId)) {
      setSelectedId(filteredInBucket[0].id);
    }
  }, [filteredInBucket, selectedId]);

  const selectedOrder = useMemo(
    () => filteredInBucket.find((order) => order.id === selectedId) ?? null,
    [filteredInBucket, selectedId]
  );

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await adminFetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      loadOrders();
    } catch {
      alert('Failed to update status');
    }
  };

  const approveOrderAction = async (orderId: string, action: 'cancel' | 'refund') => {
    const label =
      action === 'cancel'
        ? 'cancel this order and restore inventory'
        : 'refund this order and restore inventory';
    if (!confirm(`Approve ${label}?`)) return;

    try {
      const res = await adminFetch('/api/orders', {
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
      await adminFetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, paymentStatus: 'paid' }),
      });
      loadOrders();
    } catch {
      alert('Failed to confirm Bitcoin payment');
    }
  };

  const approveIdVerification = async (orderId: string) => {
    try {
      await adminFetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, idVerificationStatus: 'verified' }),
      });
      loadOrders();
    } catch {
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
    } catch {
      alert('Failed to load ID image');
    }
  };

  // Create manual order and add to user's account + notify
  const createManualOrder = async () => {
    if (!createEmail.trim()) {
      alert('Email is required to add to account and notify user');
      return;
    }
    const validItems = createItems.filter(i => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      alert('Add at least one item');
      return;
    }
    setCreating(true);
    try {
      const subtotal = validItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
      const shipping = 9.99; // default discreet
      const total = subtotal + shipping;

      const customer = {
        email: createEmail.trim(),
        name: createName.trim(),
        address: createAddress.trim(),
        city: createCity.trim(),
        state: createState.trim().toUpperCase(),
        zip: createZip.trim(),
        phone: createPhone.trim(),
      };

      const payload: any = {
        manual: true,
        customer,
        items: validItems,
        subtotal,
        shipping,
        total,
        paymentMethod: 'manual',
        paymentStatus: createPaymentStatus,
        status: createStatus,
        freeEighthBonus: createFreeEighth,
        freeEighthNote: createFreeEighth ? 'Free 1/8th manually added to account by admin' : undefined,
        trackingNumber: createTrackingNumber.trim() || undefined,
        trackingCarrier: createTrackingNumber.trim() ? createTrackingCarrier : undefined,
      };

      const res = await adminFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Manual order #${data.orderId} created and added to ${createEmail}. Notification email sent. Tracker ready.`);
        setShowCreateForm(false);
        // reset form
        setCreateEmail(''); setCreateName(''); setCreateAddress(''); setCreateCity(''); setCreateState(''); setCreateZip(''); setCreatePhone('');
        setCreateItems([{ name: '', quantity: 1, price: 0 }]);
        setCreateStatus('confirmed'); setCreatePaymentStatus('paid'); setCreateFreeEighth(false);
        setCreateTrackingNumber(''); setCreateTrackingCarrier('usps');
        await loadOrders();
        // select the new one if possible
        setTimeout(() => setSelectedId(data.orderId), 100);
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (e) {
      alert('Error creating manual order');
    } finally {
      setCreating(false);
    }
  };

  const addCreateItem = () => {
    setCreateItems([...createItems, { name: '', quantity: 1, price: 0 }]);
  };

  const updateCreateItem = (index: number, field: string, value: any) => {
    const updated = [...createItems];
    updated[index][field] = value;
    setCreateItems(updated);
  };

  const removeCreateItem = (index: number) => {
    if (createItems.length > 1) {
      setCreateItems(createItems.filter((_, i) => i !== index));
    }
  };

  const activeBucket = ADMIN_ORDER_BUCKETS.find((item) => item.id === bucket);

  return (
    <div className="mb-10">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Orders</h2>
            <p className="text-zinc-400 text-sm max-w-2xl">
              Orders are grouped by status so you can focus on what needs action. New and pending stay up front;
              completed and refunded move out of the way automatically.
            </p>
          </div>
          <button
            onClick={loadOrders}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              if (showCreateForm) setSelectedId(null); // allow form
            }}
            className="bg-emerald-600 hover:bg-emerald-700 px-5 py-3 rounded-xl text-sm font-medium text-black"
          >
            {showCreateForm ? 'Cancel Create' : '+ Create Manual Order'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ADMIN_ORDER_BUCKETS.map((item) => {
            const active = bucket === item.id;
            const count = grouped[item.id].length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setBucket(item.id)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  active ? 'bg-[#00ff9d] text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {item.label}
                <span className={`ml-2 text-xs ${active ? 'text-black/70' : 'text-zinc-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {activeBucket && (
          <p className="text-xs text-zinc-500 mt-3 px-1">{activeBucket.description}</p>
        )}
      </div>

      {loading ? (
        <p className="text-center py-20 text-xl text-zinc-400">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-center py-20 text-xl text-zinc-400">No orders placed yet.</p>
      ) : filteredInBucket.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-12 text-center">
          <p className="text-xl text-zinc-400 mb-2">No {activeBucket?.label.toLowerCase()} orders</p>
          <p className="text-sm text-zinc-500">Try another category or clear your search.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-6 min-h-[640px] overflow-x-auto">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 flex flex-col max-h-[calc(100vh-12rem)]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, name, email..."
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 mb-3 text-sm"
            />
            <p className="text-xs text-zinc-500 mb-3 px-1">
              {filteredInBucket.length} order{filteredInBucket.length === 1 ? '' : 's'}
            </p>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredInBucket.map((order) => {
                const active = order.id === selectedId;
                const orderBucket = getAdminOrderBucket(order);
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedId(order.id)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                      active
                        ? 'border-[#00ff9d] bg-[#00ff9d]/10'
                        : 'border-zinc-800 bg-black/40 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm text-[#00ff9d]">#{order.id}</span>
                      <span className="text-sm font-semibold">
                        ${order.total?.toFixed(2) || order.subtotal?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate mt-1">
                      {order.customer?.name || order.name || 'Customer'}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {order.customer?.email || order.email}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2 text-[10px]">
                      <span className="uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                        {order.status || 'pending'}
                      </span>
                      {order.paymentStatus && (
                        <span className="uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                          {order.paymentStatus}
                        </span>
                      )}
                      {orderBucket === 'new' && order.idVerification?.status === 'uploaded' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                          ID review
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-2">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {showCreateForm ? (
              <div>
                <h3 className="text-xl font-bold mb-4">Create Manual Order (adds to user's account)</h3>
                <p className="text-xs text-zinc-500 mb-4">This will create the order, notify the user by email, and make it appear in their account + Kush Tracker immediately. Use for free 1/8ths, special orders, etc.</p>

                <div className="space-y-3">
                  <input value={createEmail} onChange={e=>setCreateEmail(e.target.value)} placeholder="User Email (required for account + notify)" className="w-full bg-black border border-zinc-700 p-3 rounded-xl text-sm" />
                  <input value={createName} onChange={e=>setCreateName(e.target.value)} placeholder="Name" className="w-full bg-black border border-zinc-700 p-3 rounded-xl text-sm" />
                  <input value={createAddress} onChange={e=>setCreateAddress(e.target.value)} placeholder="Street Address" className="w-full bg-black border border-zinc-700 p-3 rounded-xl text-sm" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={createCity} onChange={e=>setCreateCity(e.target.value)} placeholder="City" className="bg-black border border-zinc-700 p-3 rounded-xl text-sm" />
                    <input value={createState} onChange={e=>setCreateState(e.target.value)} placeholder="State" className="bg-black border border-zinc-700 p-3 rounded-xl text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={createZip} onChange={e=>setCreateZip(e.target.value)} placeholder="Zip" className="bg-black border border-zinc-700 p-3 rounded-xl text-sm" />
                    <input value={createPhone} onChange={e=>setCreatePhone(e.target.value)} placeholder="Phone" className="bg-black border border-zinc-700 p-3 rounded-xl text-sm" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2 text-sm">
                      <span>Items</span>
                      <button onClick={addCreateItem} className="text-[#00ff9d] text-xs">+ Add Item</button>
                    </div>
                    {createItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input value={item.name} onChange={e=>updateCreateItem(idx,'name',e.target.value)} placeholder="Item name (e.g. Free 1/8th - Strain)" className="flex-1 bg-black border border-zinc-700 p-2 rounded text-sm" />
                        <input type="number" value={item.quantity} onChange={e=>updateCreateItem(idx,'quantity',parseInt(e.target.value)||1)} className="w-16 bg-black border border-zinc-700 p-2 rounded text-sm" />
                        <input type="number" step="0.01" value={item.price} onChange={e=>updateCreateItem(idx,'price',parseFloat(e.target.value)||0)} placeholder="Price" className="w-20 bg-black border border-zinc-700 p-2 rounded text-sm" />
                        {createItems.length > 1 && <button onClick={()=>removeCreateItem(idx)} className="text-red-400 px-2">×</button>}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <select value={createStatus} onChange={e=>setCreateStatus(e.target.value)} className="bg-black border border-zinc-700 p-3 rounded-xl">
                      <option value="confirmed">confirmed</option>
                      <option value="packing">packing</option>
                      <option value="sealed">sealed</option>
                      <option value="shipped">shipped</option>
                      <option value="delivered">delivered</option>
                    </select>
                    <select value={createPaymentStatus} onChange={e=>setCreatePaymentStatus(e.target.value)} className="bg-black border border-zinc-700 p-3 rounded-xl">
                      <option value="paid">paid</option>
                      <option value="manual">manual (awaiting)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={createFreeEighth} onChange={e=>setCreateFreeEighth(e.target.checked)} />
                    Include Free 1/8th bonus (for tracker/account)
                  </label>

                  <div>
                    <input value={createTrackingNumber} onChange={e=>setCreateTrackingNumber(e.target.value)} placeholder="Tracking number (optional, for immediate ship)" className="w-full bg-black border border-zinc-700 p-3 rounded-xl text-sm font-mono mb-2" />
                    <select value={createTrackingCarrier} onChange={e=>setCreateTrackingCarrier(e.target.value)} className="bg-black border border-zinc-700 p-3 rounded-xl text-sm">
                      <option value="usps">USPS</option>
                      <option value="ups">UPS</option>
                      <option value="fedex">FedEx</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <button onClick={createManualOrder} disabled={creating || !createEmail.trim()} className="w-full py-3 bg-[#00ff9d] text-black font-bold rounded-2xl disabled:opacity-50 mt-2">
                    {creating ? 'Creating & Notifying...' : 'Create Order, Add to Account & Notify User'}
                  </button>
                  <p className="text-[10px] text-zinc-500 mt-1">Order will appear in user's /account and /track immediately. Email confirmation sent. Tracker will reflect status/tracking accurately.</p>
                </div>
              </div>
            ) : !selectedOrder ? (
              <div className="h-full flex items-center justify-center text-zinc-500">
                Select an order or use "Create Manual Order" above
              </div>
            ) : (
              <OrderDetailPanel
                order={selectedOrder}
                onUpdated={loadOrders}
                onUpdateStatus={updateStatus}
                onApproveAction={approveOrderAction}
                onConfirmBtc={confirmBtcPayment}
                onApproveId={approveIdVerification}
                onViewId={viewIdImage}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderDetailPanel({
  order,
  onUpdated,
  onUpdateStatus,
  onApproveAction,
  onConfirmBtc,
  onApproveId,
  onViewId,
}: {
  order: any;
  onUpdated: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onApproveAction: (orderId: string, action: 'cancel' | 'refund') => void;
  onConfirmBtc: (orderId: string) => void;
  onApproveId: (orderId: string) => void;
  onViewId: (orderId: string) => void;
}) {
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
        <div>
          <div className="font-mono text-3xl text-[#00ff9d]">#{order.id}</div>
          <div className="text-sm text-zinc-400 mt-2">
            {new Date(order.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            ${order.total?.toFixed(2) || order.subtotal?.toFixed(2) || '0.00'}
          </div>
          <div className="text-sm uppercase tracking-widest text-zinc-400">{order.paymentMethod}</div>
          {order.btcPayment?.amountBtc && (
            <div className="text-xs text-zinc-500 mt-1 font-mono">
              {order.btcPayment.amountBtc.toFixed(8)} BTC
            </div>
          )}
          {order.paymentStatus && (
            <div
              className={`text-sm mt-1 ${
                order.paymentStatus === 'paid' ? 'text-green-400' : 'text-yellow-400'
              }`}
            >
              Payment: {order.paymentStatus}
            </div>
          )}
          {order.transactionId && (
            <div className="text-xs text-zinc-500 mt-1 font-mono">Txn: {order.transactionId}</div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {order.paymentMethod === 'btc' && order.paymentStatus === 'awaiting_btc' && (
          <button
            onClick={() => onConfirmBtc(order.id)}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-medium"
          >
            Confirm BTC Payment
          </button>
        )}
        {order.status !== 'processing' &&
          order.status !== 'shipped' &&
          order.status !== 'delivered' &&
          order.status !== 'cancelled' &&
          order.status !== 'refunded' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'processing')}
              className="px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-sm font-medium"
            >
              Mark Processing
            </button>
          )}

        {/* Kush Tracker stage controls (pizza-tracker style but weed themed) */}
        {order.status !== 'packing' && order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'refunded' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'packing')}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 rounded-xl text-sm font-medium"
          >
            Mark Packing
          </button>
        )}
        {order.status !== 'sealed' && order.status !== 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'refunded' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'sealed')}
            className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 rounded-xl text-sm font-medium"
          >
            Mark Sealed / QC
          </button>
        )}
        {order.status === 'shipped' && order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'refunded' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'delivered')}
            className="px-4 py-2.5 bg-green-700 hover:bg-green-600 rounded-xl text-sm font-medium"
          >
            Mark Delivered
          </button>
        )}

        {/* Auto-advance rules for the visual Kush Tracker (smart garden-to-door logic) */}
        {(() => {
          const suggested = getSuggestedNextStatus(order);
          if (!suggested) return null;
          const label = getSuggestedNextLabel(suggested);
          return (
            <button
              onClick={() => onUpdateStatus(order.id, suggested)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl text-sm font-medium"
              title="Applies tracker-aware auto-advance rules (e.g. paid+verified → packing, packing → sealed)"
            >
              ✨ {label}
            </button>
          );
        })()}
        {order.inventoryDeducted &&
          !order.inventoryRestored &&
          order.status !== 'cancelled' &&
          order.status !== 'refunded' && (
            <>
              <button
                onClick={() => onApproveAction(order.id, 'cancel')}
                className="px-4 py-2.5 bg-red-700 hover:bg-red-800 rounded-xl text-sm font-medium"
              >
                Approve Cancel
              </button>
              <button
                onClick={() => onApproveAction(order.id, 'refund')}
                className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 rounded-xl text-sm font-medium"
              >
                Approve Refund
              </button>
            </>
          )}
      </div>

      {order.inventoryRestored && (
        <p className="text-sm text-emerald-400 mb-4">
          Inventory restored
          {order.inventoryRestoredAt && ` · ${new Date(order.inventoryRestoredAt).toLocaleString()}`}
        </p>
      )}

      <OrderShippingControls order={order} onUpdated={onUpdated} />

      <div className="space-y-6">
        <div>
          <p className="font-medium">{order.customer?.name || order.name}</p>
          <p className="text-sm text-zinc-400">{order.customer?.email || order.email}</p>
          {(order.customer?.phone || order.phone) && (
            <p className="text-sm text-zinc-400">Phone: {order.customer?.phone || order.phone}</p>
          )}
          <p className="text-sm text-zinc-400 mt-1">
            {order.customer?.address || order.address}, {order.customer?.city || order.city}{' '}
            {order.customer?.state || order.state} {order.customer?.zip || order.zip}
          </p>
          <p className="text-sm mt-2">
            Status:{' '}
            <span className="text-[#00ff9d] uppercase">{order.status || 'pending'}</span>
          </p>
          {order.trackingNumber && (
            <p className="text-sm mt-1 text-zinc-400">
              Tracking: <span className="font-mono text-white">{order.trackingNumber}</span>
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

          {/* Quick link to the customer-facing tracker (great for support) */}
          <p className="mt-3">
            <a
              href={`/track/${order.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline text-[#00ff9d] hover:text-[#00ff9d]/80"
            >
              Open customer Kush Tracker (live view) ↗
            </a>
            <span className="text-[10px] text-zinc-500 ml-2">— what they see</span>
          </p>
          {order.promoCode && (
            <p className="text-sm mt-1 text-zinc-400">
              Promo: <span className="text-[#00ff9d]">{order.promoCode}</span>
              {order.referrerName && ` (by ${order.referrerName})`}
            </p>
          )}
          {order.freeEighthNote && (
            <p className="text-sm mt-2 text-amber-300">{order.freeEighthNote}</p>
          )}
          {order.freeTshirtNote && (
            <p className="text-sm mt-1 text-pink-300">{order.freeTshirtNote}</p>
          )}
          <p className="text-sm mt-1">
            ID Verification:{' '}
            <span
              className={`uppercase font-medium ${
                order.idVerification?.status === 'verified'
                  ? 'text-green-400'
                  : order.idVerification?.status === 'uploaded'
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}
            >
              {order.idVerification?.status || 'required'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {order.idVerification?.status === 'uploaded' && (
            <>
              <button
                onClick={() => onViewId(order.id)}
                className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm"
              >
                View ID Photo
              </button>
              <button
                onClick={() => onApproveId(order.id)}
                className="px-5 py-3 bg-[#00ff9d] text-black hover:bg-[#00ff9d]/90 rounded-xl text-sm font-medium"
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
                {formatCartItemOptions(item, undefined, { includeSku: true }) && (
                  <p className="text-xs text-zinc-400 mt-1">
                    {formatCartItemOptions(item, undefined, { includeSku: true })}
                  </p>
                )}
                <p className="text-xs text-zinc-400">Qty: {item.quantity}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}