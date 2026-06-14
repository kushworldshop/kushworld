'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already installed, after some interaction
      setTimeout(() => setShow(true), 30000); // delay for UX
    };

    window.addEventListener('beforeinstallprompt', handler as any);

    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted install');
    }
    setDeferredPrompt(null);
    setShow(false);
  };

  if (!show || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 z-[70] bg-zinc-900 border border-[#00ff9d]/30 rounded-2xl p-4 shadow-xl max-w-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl">📱</div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Install Kush World</p>
          <p className="text-xs text-zinc-400 mt-1">Get the full app experience with offline access and quick launch from your home screen.</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-[#00ff9d] text-black text-sm font-bold rounded-xl"
            >
              Install
            </button>
            <button
              onClick={() => setShow(false)}
              className="px-4 py-2 text-sm text-zinc-400"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
