'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const ADMIN_PASSWORD = "kushworld2026"; // ← CHANGE THIS TO YOUR OWN STRONG PASSWORD

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [error, setError] = useState("");

  // Login handler
  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError("");
      loadOrders();
    } else {
      setError("Incorrect password");
    }
  };

  // Load orders from API
  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders", err);
    }
    setLoading(false);
  };

  // Update order status (example: mark as shipped)
  const updateStatus = async (orderId: string, newStatus: string) => {
    // For now we just refresh - later we can add PUT endpoint if needed
    alert(`Order ${orderId} status changed to ${newStatus}. (Backend update coming soon)`);
    loadOrders();
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-zinc-900 p-10 rounded-3xl max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-[#00ff9d] mb-8">Admin Login</h1>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter admin password"
            className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-6 text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-[#00ff9d] text-black py-4 rounded-2xl font-bold text-lg"
          >
            Login to Admin Panel
          </button>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold">Admin Orders</h1>
          <div className="flex gap-4">
            <button onClick={loadOrders} className="bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-2xl">
              Refresh
            </button>
            <button onClick={() => setAuthenticated(false)} className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-2xl">
              Logout
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-xl">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-xl text-zinc-400">No orders yet.</p>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => (
              <div key={order.id} className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
                <div className="flex justify-between mb-6">
                  <div>
                    <span className="font-mono text-[#00ff9d] text-lg">Order #{order.id}</span>
                    <p className="text-sm text-zinc-400 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-4 py-1 rounded-full text-sm font-medium ${order.status === 'pending' ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="font-semibold mb-2">Customer</p>
                  <p>{order.customer.name} — {order.customer.email}</p>
                  <p className="text-sm text-zinc-400">{order.customer.address}, {order.customer.city} {order.customer.state} {order.customer.zip}</p>
                </div>

                <div className="mb-8">
                  <p className="font-semibold mb-4">Items</p>
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-4 py-3 border-t border-zinc-800">
                      <Image src={item.image} alt={item.name} width={60} height={60} className="rounded-xl" />
                      <div className="flex-1">
                        <p>{item.name} {item.selectedSize && `(${item.selectedSize})`}</p>
                        <p className="text-sm text-zinc-400">${item.price} × {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-zinc-800">
                  <div>
                    <p className="text-xl font-bold">Total: ${order.subtotal.toFixed(2)}</p>
                    <p className="text-sm text-zinc-400">Payment: {order.paymentMethod.toUpperCase()}</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => updateStatus(order.id, 'shipped')}
                      className="bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-2xl text-sm"
                    >
                      Mark as Shipped
                    </button>
                    <button 
                      onClick={() => updateStatus(order.id, 'cancelled')}
                      className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-2xl text-sm"
                    >
                      Cancel Order
                    </button>
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