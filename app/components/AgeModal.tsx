'use client';

import { setAgeVerified, setMerchOnlyMode } from '@/lib/ageAccess';
import { useSiteContent } from '@/lib/useSiteContent';

interface AgeModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onMerchOnly: () => void;
}

export default function AgeModal({ isOpen, onConfirm, onMerchOnly }: AgeModalProps) {
  const { content } = useSiteContent();

  if (!isOpen) return null;

  const handleConfirm = () => {
    setAgeVerified();
    onConfirm();
  };

  const handleMerchOnly = () => {
    setMerchOnlyMode();
    onMerchOnly();

    if (window.location.pathname === '/') {
      document.getElementById('merch')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.href = '/#merch';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-6">
      <div className="bg-zinc-900 p-10 rounded-3xl max-w-md text-center border border-[#00ff9d]/40">
        <h2 className="text-3xl font-bold mb-4">{content.ageGate.title}</h2>
        <p className="text-zinc-400 mb-8 leading-relaxed">{content.ageGate.body}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleConfirm}
            className="bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black px-8 py-4 rounded-2xl font-bold transition"
          >
            {content.ageGate.confirmLabel}
          </button>
          <button
            onClick={handleMerchOnly}
            className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 rounded-2xl font-medium transition"
          >
            {content.ageGate.merchOnlyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}