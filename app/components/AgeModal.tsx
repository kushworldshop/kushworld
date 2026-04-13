'use client';
import { useState } from 'react';

interface AgeModalProps {
  isOpen: boolean;
  onVerified: () => void;
  onLoginSuccess?: () => void;   // optional if not always used
}

export default function AgeModal({ isOpen, onVerified, onLoginSuccess }: AgeModalProps) {
  const [age, setAge] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18) {
      setError('You must be 18 or older to enter.');
      return;
    }

    // Age verified
    onVerified();

    // Optional: auto-login or success callback
    if (onLoginSuccess) {
      setTimeout(onLoginSuccess, 800);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100]">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 max-w-md w-full mx-4">
        <h2 className="text-3xl font-bold text-center mb-8 text-white">Age Verification</h2>
        
        <p className="text-zinc-400 text-center mb-8">
          You must be 18 years or older to access this site.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Enter your age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="18"
              className="w-full bg-black border border-zinc-700 rounded-2xl px-6 py-4 text-white text-2xl focus:border-[#00ff9d] outline-none"
              min="1"
              max="120"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-center text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black font-bold rounded-2xl text-lg transition"
          >
            Verify Age
          </button>
        </form>

        <p className="text-xs text-zinc-500 text-center mt-6">
          This site contains adult content. Please leave if you are under 18.
        </p>
      </div>
    </div>
  );
}