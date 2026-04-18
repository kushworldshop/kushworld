'use client';

import { useState } from 'react';

interface AgeModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AgeModal({ isOpen, onConfirm, onCancel }: AgeModalProps) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setAgeConfirmed(true);
    localStorage.setItem('loggedIn', 'true'); // or your preferred key
    onConfirm();
  };

  const handleCancel = () => {
    // Allow browsing merch anyway (or redirect if you prefer strict 21+)
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 p-8 rounded-xl max-w-md text-center border border-green-500">
        <h2 className="text-3xl font-bold mb-4 text-white">Age Verification</h2>
        <p className="text-zinc-300 mb-8">
          You must be 21+ to enter this cannabis shop. 
          <br />Are you 21 years or older?
        </p>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-medium transition"
          >
            Yes, I am 21+
          </button>
          
          <button
            onClick={handleCancel}
            className="bg-zinc-700 hover:bg-zinc-600 px-8 py-3 rounded-lg font-medium transition"
          >
            No, take me away
          </button>
        </div>
      </div>
    </div>
  );
}