'use client';

import { useEffect, useState } from 'react';
import AgeModal from './AgeModal';
import { AGE_ACCESS_EVENT, shouldShowAgeModal } from '@/lib/ageAccess';
import { useSiteContent } from '@/lib/useSiteContent';

export default function AgeGateProvider({ children }: { children: React.ReactNode }) {
  const { content } = useSiteContent();
  const ageGateEnabled = content.features.ageGate.enabled;

  const [showModal, setShowModal] = useState(() => {
    if (!ageGateEnabled || typeof window === 'undefined') return false;
    return shouldShowAgeModal();
  });

  useEffect(() => {
    if (!ageGateEnabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowModal(false);
      return;
    }

    const sync = () => setShowModal(shouldShowAgeModal());
    window.addEventListener(AGE_ACCESS_EVENT, sync);
    return () => window.removeEventListener(AGE_ACCESS_EVENT, sync);
  }, [ageGateEnabled]);

  return (
    <>
      {ageGateEnabled && (
        <AgeModal
          isOpen={showModal}
          onConfirm={() => setShowModal(false)}
          onMerchOnly={() => setShowModal(false)}
        />
      )}
      {children}
    </>
  );
}