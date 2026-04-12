'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function CustomerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const savedPassword = localStorage.getItem(`customer_${email}`);
      
      if (savedPassword && savedPassword === password) {
        localStorage.setItem('customerEmail', email);
        window.location.href = '/account';
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md border border-zinc-700">
        <h1 className="text-4xl font-bold text-center mb-2">Welcome Back</h1>
        <p className="text-center text-zinc-400 mb-10">Sign in to your Kush World account</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-[#00ff9d]"
              required 
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-[#00ff9d]"
              required 
            />
          </div>

          {error && <p className="text-red-400 text-center text-sm">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-[#00ff9d] text-black font-bold rounded-3xl text-lg hover:bg-[#00ff9d]/90 disabled:opacity-70 transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center mt-8">
          <p className="text-zinc-400">
            Don't have an account?{' '}
            <Link href="/account/register" className="text-[#00ff9d] hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}