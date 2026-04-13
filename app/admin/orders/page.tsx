'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const ADMIN_PASSWORD = "KushWorld$26"; // ← Change this to whatever you want

export default function AdminOrders() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated in this session
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
      const data = await res.json();
      setOrders(data);
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
      loadOrders(); // Refresh list
    } catch (e) {
      alert('Failed to update status');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md text-center">
          <h1 className="text-4xl font-bold mb-8 text-[#00ff9d]">Admin Login</h1>
          
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

          {error && <p className="text-red-500 mt-6">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-bold">Admin Orders Dashboard</h1>
          <button 
            onClick={logout}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-2xl font-medium"
          >
            Logout
          </button>
        </div>

        {loading ? (
          <p className="text-center py-20 text-zinc-400">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-center py-20 text-zinc-400">No orders yet.</p>
        ) : (
          <div className="space-y-8">
            {orders.map((order: any) => (
              <div key={order.id} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-700">
                <div className="flex justify-between mb-6">
                  <div>
                    <span className="font-mono text-[#00ff9d] text-2xl">#{order.id}</span>
                    <p className="text-sm text-zinc-400 mt-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">${order.subtotal?.toFixed(2)}</p>
                    <p className="text-sm text-zinc-400">{order.paymentMethod?.toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex gap-4 mb-8">
                  <button 
                    onClick={() => updateStatus(order.id, 'processing')}
                    className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-2xl text-sm font-medium"
                  >
                    Mark Processing
                  </button>
                  <button 
                    onClick={() => updateStatus(order.id, 'shipped')}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-2xl text-sm font-medium"
                  >
                    Mark Shipped
                  </button>
                </div>

                <div>
                  <p className="font-medium mb-4">Customer: {order.name} — {order.email}</p>
                  <p className="text-sm text-zinc-400 mb-6">Address: {order.address}, {order.city} {order.state} {order.zip}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4 bg-black p-4 rounded-2xl">
                        <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.selectedSize && <p className="text-xs text-zinc-400">Size: {item.selectedSize}</p>}
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