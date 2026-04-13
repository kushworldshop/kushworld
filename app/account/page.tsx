'use client';

import { useState, useEffect } from 'react';

export default function Account() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        loadOrders(parsedUser.email);
      } catch (e) {}
    } else {
      setLoading(false);
    }
  }, []);

  const loadOrders = async (userEmail: string) => {
    try {
      const res = await fetch('/api/orders');
      const allOrders = await res.json();
      // Filter only this user's orders
      const myOrders = allOrders.filter((o: any) => o.email?.toLowerCase() === userEmail.toLowerCase());
      setOrders(myOrders);
    } catch (e) {
      console.error('Failed to load orders');
    }
    setLoading(false);
  };

  const handleAuth = async () => {
    setMessage('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { email, password } 
      : { email, password, name: name || undefined };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        if (isLogin) {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          setUser(data.user);
          loadOrders(data.user.email);
        } else {
          setMessage("Account created! You can now log in.");
          setIsLogin(true);
        }
      } else {
        setMessage(data.error || "Something went wrong");
      }
    } catch (err) {
      setMessage("Network error. Please try again.");
    }
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    setOrders([]);
  };

  // Logged-in View with Order Tracking
  if (user) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-4xl font-bold">My Account</h1>
            <button 
              onClick={logout}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-2xl text-sm"
            >
              Logout
            </button>
          </div>

          <div className="bg-zinc-900 p-8 rounded-3xl mb-10">
            <p className="text-xl">
              Welcome back, <span className="text-[#00ff9d]">{user.name || user.email}</span>
            </p>
            <p className="text-zinc-400">{user.email}</p>
          </div>

          <h2 className="text-3xl font-semibold mb-8">Your Orders & Tracking</h2>

          {loading ? (
            <p className="text-center py-12 text-zinc-400">Loading your orders...</p>
          ) : orders.length === 0 ? (
            <div className="bg-zinc-900 p-12 rounded-3xl text-center">
              <p className="text-2xl mb-4">No orders yet</p>
              <p className="text-zinc-400">When you place an order, it will appear here with tracking info.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {orders.map((order: any) => (
                <div key={order.id} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-700">
                  <div className="flex flex-col md:flex-row justify-between mb-6">
                    <div>
                      <span className="font-mono text-[#00ff9d] text-xl">#{order.id}</span>
                      <p className="text-sm text-zinc-400 mt-1">
                        {new Date(order.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', month: 'long', day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="mt-4 md:mt-0 text-right">
                      <p className="font-semibold text-lg">Total: ${order.subtotal?.toFixed(2) || '0.00'}</p>
                      <p className="text-sm text-zinc-400">Paid via {order.paymentMethod?.toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="font-medium mb-2">Order Status</p>
                    <div className={`inline-block px-6 py-2 rounded-full text-sm font-semibold ${
                      order.status === 'shipped' ? 'bg-green-600' : 
                      order.status === 'processing' ? 'bg-yellow-600' : 'bg-blue-600'
                    }`}>
                      {order.status?.toUpperCase() || 'PENDING'}
                    </div>
                  </div>

                  {/* Simple Tracking Timeline */}
                  <div className="space-y-4 border-l-2 border-zinc-700 pl-6 ml-3">
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-[#00ff9d] flex-shrink-0 mt-1"></div>
                      <div>
                        <p className="font-medium">Order Placed</p>
                        <p className="text-sm text-zinc-400">{new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-zinc-700 flex-shrink-0 mt-1"></div>
                      <div>
                        <p className="font-medium">Payment Confirmed</p>
                        <p className="text-sm text-zinc-400">We manually verify and prepare your order</p>
                      </div>
                    </div>
                    {order.status === 'shipped' && (
                      <div className="flex gap-4">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex-shrink-0 mt-1"></div>
                        <div>
                          <p className="font-medium">Shipped</p>
                          <p className="text-sm text-zinc-400">Estimated delivery: 3–7 business days</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="mt-8 pt-6 border-t border-zinc-700">
                    <p className="font-medium mb-4">Items</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex gap-4 bg-black p-4 rounded-2xl">
                          <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl" />
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            {item.selectedSize && <p className="text-sm text-zinc-400">Size: {item.selectedSize}</p>}
                            <p className="text-sm">Qty: {item.quantity} × ${item.price}</p>
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

  // Login / Register Form (unchanged)
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-[#00ff9d]">
          {isLogin ? "Login to Your Account" : "Create New Account"}
        </h1>

        {!isLogin && (
          <input
            type="text"
            placeholder="Full Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-4"
          />
        )}

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-4"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-black border border-zinc-700 p-4 rounded-2xl mb-6"
        />

        <button
          onClick={handleAuth}
          className="w-full bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black py-4 rounded-2xl font-bold text-lg mb-6 transition"
        >
          {isLogin ? "Login" : "Create Account"}
        </button>

        <p className="text-center text-sm text-zinc-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setMessage(''); }} 
            className="text-[#00ff9d] hover:underline font-medium"
          >
            {isLogin ? "Sign up" : "Login"}
          </button>
        </p>

        {message && <p className="text-center mt-6 text-red-400 text-sm">{message}</p>}
      </div>
    </div>
  );
}