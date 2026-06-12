'use client';

import { useEffect, useState } from 'react';
import AgeModal from './AgeModal';
import { AGE_ACCESS_EVENT, shouldShowAgeModal } from '@/lib/ageAccess';

export default function AgeGateProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setShowModal(shouldShowAgeModal());

    const sync = () => setShowModal(shouldShowAgeModal());
    window.addEventListener(AGE_ACCESS_EVENT, sync);
    return () => window.removeEventListener(AGE_ACCESS_EVENT, sync);
  }, []);

  return (
    <>
      <AgeModal
        isOpen={showModal}
        onConfirm={() => setShowModal(false)}
        onMerchOnly={() => setShowModal(false)}
      />
      {children}
    </>
  );
}