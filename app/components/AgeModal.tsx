'use client';
import { useState, useEffect } from 'react';

interface AgeModalProps {
  onVerified: () => void;
  onDecline: () => void;
}

export default function AgeModal({ onVerified, onDecline }: AgeModalProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hasVerified = localStorage.getItem('ageVerified') === 'true';
    if (hasVerified) {
      setIsVisible(false);
      onVerified();
    }
  }, [onVerified]);

  const handleVerify = () => {
    localStorage.setItem('ageVerified', 'true');
    setIsVisible(false);
    onVerified();
  };

  const handleDecline = () => {
    setIsVisible(false);
    onDecline();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-[10000] flex items-center justify-center p-6">
      <div className="bg-zinc-900 rounded-3xl max-w-md w-full p-10 text-center border border-zinc-700">
        <div className="text-6xl mb-8">🌿</div>
        
        <h1 className="text-4xl font-bold mb-4">Are you 21 or older?</h1>
        <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
          This website sells adult products. You must be 21+ to enter.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleVerify}
            className="w-full py-5 bg-[#00ff9d] text-black font-bold text-xl rounded-3xl hover:bg-[#00ff9d]/90 transition"
          >
            YES, I AM 21 OR OLDER
          </button>

          <button 
            onClick={handleDecline}
            className="w-full py-5 border border-zinc-700 hover:bg-zinc-800 font-semibold rounded-3xl transition"
          >
            NO, TAKE ME TO MERCH ONLY
          </button>
        </div>

        <p className="text-xs text-zinc-500 mt-10">
          We verify age for compliance. Merch is available to all ages.
        </p>
      </div>
    </div>
  );
}