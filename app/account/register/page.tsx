'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function CustomerRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // Save customer account
    localStorage.setItem(`customer_${email}`, password);
    localStorage.setItem('customerEmail', email);

    setMessage("Account created successfully! Redirecting...");
    
    setTimeout(() => {
      window.location.href = '/account';
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md border border-zinc-700">
        <h1 className="text-4xl font-bold text-center mb-2">Join Kush World</h1>
        <p className="text-center text-zinc-400 mb-10">Create your account to track orders and more</p>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <input 
              type="email" 
              placeholder="Email Address (used at checkout)" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-[#00ff9d]"
              required 
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Create Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-[#00ff9d]"
              required 
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Confirm Password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-2xl px-6 py-4 focus:outline-none focus:border-[#00ff9d]"
              required 
            />
          </div>

          {error && <p className="text-red-400 text-center">{error}</p>}
          {message && <p className="text-green-400 text-center">{message}</p>}

          <button 
            type="submit" 
            className="w-full py-4 bg-[#00ff9d] text-black font-bold rounded-3xl text-lg hover:bg-[#00ff9d]/90 transition"
          >
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-8">
          Already have an account?{' '}
          <Link href="/account/login" className="text-[#00ff9d] hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}