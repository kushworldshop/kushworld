'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Order {
  orderId: string;
  date: string;
  status: 'pending' | 'paid' | 'shipped';
  items: any[];
  customerInfo: {
    name: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  };
  paymentMethod: string;
  total: number;
  notes: string;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    if (!loggedIn) {
      router.push('/admin/login');
      return;
    }
    fetchOrders();
  }, [router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: 'pending' | 'paid' | 'shipped') => {
    setOrders(prev => prev.map(order => 
      order.orderId === orderId ? { ...order, status: newStatus } : order
    ));
    alert(`Order ${orderId} status updated to ${newStatus}`);
  };

  const logout = () => {
    localStorage.removeItem('adminLoggedIn');
    router.push('/admin/login');
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">Loading orders...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold">Kush World Admin • Orders</h1>
          <div className="flex gap-4">
            <button 
              onClick={logout}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-2xl font-semibold transition"
            >
              Logout
            </button>
            <button 
              onClick={fetchOrders} 
              className="px-8 py-3 bg-[#00ff9d] text-black rounded-2xl font-semibold hover:bg-[#00ff9d]/90 transition"
            >
              Refresh Orders
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="text-center text-zinc-400 text-xl py-20">No orders yet.</p>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => (
              <div key={order.orderId} className="bg-zinc-900 rounded-3xl p-8 border border-zinc-700">
                {/* Order header and status buttons - same as before */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Order #{order.orderId}</h2>
                    <p className="text-zinc-400">{new Date(order.date).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => updateStatus(order.orderId, 'pending')} className={`px-5 py-2 rounded-2xl text-sm ${order.status === 'pending' ? 'bg-yellow-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}>Pending</button>
                    <button onClick={() => updateStatus(order.orderId, 'paid')} className={`px-5 py-2 rounded-2xl text-sm ${order.status === 'paid' ? 'bg-green-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}>Paid</button>
                    <button onClick={() => updateStatus(order.orderId, 'shipped')} className={`px-5 py-2 rounded-2xl text-sm ${order.status === 'shipped' ? 'bg-blue-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}>Shipped</button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-3 text-[#00ff9d]">Customer</h3>
                    <p><strong>Name:</strong> {order.customerInfo.name}</p>
                    <p><strong>Email:</strong> {order.customerInfo.email}</p>
                    <p><strong>Phone:</strong> {order.customerInfo.phone}</p>
                    <p><strong>Address:</strong> {order.customerInfo.address}, {order.customerInfo.city}, {order.customerInfo.state} {order.customerInfo.zip}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-[#00ff9d]">Payment</h3>
                    <p><strong>Method:</strong> {order.paymentMethod.toUpperCase()}</p>
                    <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
                    <p><strong>Status:</strong> <span className="capitalize font-medium">{order.status}</span></p>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="font-semibold mb-4 text-[#00ff9d]">Items</h3>
                  <div className="space-y-4">
                    {order.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between bg-zinc-950 p-4 rounded-2xl">
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          {item.size && <p className="text-sm text-zinc-400">Size: {item.size}</p>}
                        </div>
                        <div className="text-right">
                          <p>Qty: {item.quantity}</p>
                          <p className="text-[#00ff9d]">${(item.product.price * item.quantity).toFixed(2)}</p>
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