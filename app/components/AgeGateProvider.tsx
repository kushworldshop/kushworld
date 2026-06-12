'use client';

import { useEffect, useState } from 'react';
import AgeModal from './AgeModal';
import { AGE_ACCESS_EVENT, shouldShowAgeModal } from '@/lib/ageAccess';
import { useSiteContent } from '@/lib/useSiteContent';

export default function AgeGateProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const { content } = useSiteContent();
  const ageGateEnabled = content.features.ageGate.enabled;

  useEffect(() => {
    if (!ageGateEnabled) {
      setShowModal(false);
      return;
    }
    setShowModal(shouldShowAgeModal());

    const sync = () => setShowModal(ageGateEnabled && shouldShowAgeModal());
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