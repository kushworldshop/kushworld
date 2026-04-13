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
        loadOrders();
      } catch (e) {}
    } else {
      setLoading(false);
    }
  }, []);

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const allOrders = await res.json();
      setOrders(allOrders);
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
          loadOrders();
        } else {
          setMessage("Account created successfully! You can now log in.");
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

  // === Logged-in View ===
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
              Welcome back, <span className="text-[#00ff9d]">{user.name}</span>
            </p>
            <p className="text-zinc-400">{user.email}</p>
          </div>

          <h2 className="text-2xl font-semibold mb-6">Your Orders</h2>

          {loading ? (
            <p>Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-zinc-400">No orders yet.</p>
          ) : (
            <div className="space-y-6">
              {orders.map((order: any) => (
                <div key={order.id} className="bg-zinc-900 p-6 rounded-3xl">
                  <div className="flex justify-between mb-4">
                    <span className="font-mono text-[#00ff9d]">#{order.id}</span>
                    <span className="text-sm text-zinc-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-semibold">Total: ${order.subtotal?.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-zinc-400">Payment: {order.paymentMethod?.toUpperCase()}</p>
                  <p className="text-sm">Status: <span className="capitalize">{order.status}</span></p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === Login / Register Form ===
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