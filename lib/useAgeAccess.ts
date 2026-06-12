'use client';

import { useEffect, useState } from 'react';
import { AGE_ACCESS_EVENT, getAgeAccessMode, type AgeAccessMode } from './ageAccess';

export function useAgeAccess() {
  const [mode, setMode] = useState<AgeAccessMode>('unverified');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMode(getAgeAccessMode());
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