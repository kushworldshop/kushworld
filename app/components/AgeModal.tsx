'use client';

interface AgeModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export default function AgeModal({ isOpen, onConfirm }: AgeModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    localStorage.setItem('ageVerified', 'true');
    onConfirm();
  };

  const handleDeny = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-6">
      <div className="bg-zinc-900 p-10 rounded-3xl max-w-md text-center border border-[#00ff9d]/40">
        <h2 className="text-3xl font-bold mb-4">21+ Age Verification</h2>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          You must be 21 years or older to enter Kush World. By entering you confirm you are of legal age in your state.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleConfirm}
            className="bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black px-8 py-4 rounded-2xl font-bold transition"
          >
            Yes, I am 21+
          </button>
          <button
            onClick={handleDeny}
            className="bg-zinc-800 hover:bg-zinc-700 px-8 py-4 rounded-2xl font-medium transition"
          >
            No, exit site
          </button>
        </div>
      </div>
    </div>
  );
}