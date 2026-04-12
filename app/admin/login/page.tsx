'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Change these credentials to whatever you want
    const correctUsername = "admin";
    const correctPassword = "kushworld2026";   // ← Change this to something secure

    if (username === correctUsername && password === correctPassword) {
      localStorage.setItem('adminLoggedIn', 'true');
      router.push('/admin/orders');
    } else {
      setError("Incorrect username or password");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md border border-zinc-700">
        <h1 className="text-4xl font-bold text-center mb-10">Admin Login</h1>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-[#00ff9d]"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-[#00ff9d]"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full py-4 bg-[#00ff9d] text-black font-bold rounded-3xl text-lg hover:bg-[#00ff9d]/90 transition"
          >
            Login to Admin
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-8">
          Default: username = admin<br />
          Password = kushworld2026 (change it after first login)
        </p>
      </div>
    </div>
  );
}