'use client';

import { useEffect, useState } from 'react';
import { AGE_ACCESS_EVENT, getAgeAccessMode, type AgeAccessMode } from './ageAccess';

export function useAgeAccess() {
  const [mode, setMode] = useState<AgeAccessMode>(() => {
    if (typeof window === 'undefined') return 'unverified';
    return getAgeAccessMode();
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);

    const sync = () => setMode(getAgeAccessMode());
    window.addEventListener(AGE_ACCESS_EVENT, sync);
    return () => window.removeEventListener(AGE_ACCESS_EVENT, sync);
  }, []);

  return {
    ready,
    mode,
    isMerchOnly: mode === 'merch-only',
    isVerified: mode === 'verified',
    needsAgeModal: mode === 'unverified',
  };
}