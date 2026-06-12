'use client';

import { useState, useEffect } from 'react';

const ADMIN_PASSWORD = "kushworld2026"; // Change this anytime you want

export default function AdminOrders() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('adminAuthenticated') === 'true') {
      setAuthenticated(true);
      loadOrders();
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
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-bold">Admin Orders Dashboard</h1>
          <button 
            onClick={logout}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-medium transition"
          >
            Logout
          </button>
        </div>

        {loading ? (
          <p className="text-center py-20 text-xl text-zinc-400">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-center py-20 text-xl text-zinc-400">No orders placed yet.</p>
        ) : (
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
        )}
      </div>
    </div>
  );
}