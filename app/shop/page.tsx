'use client';

import { Suspense } from 'react';
import SiteLayout from '@/app/components/SiteLayout';
import ShopSection from '@/app/components/ShopSection';
import { useAgeAccess } from '@/lib/useAgeAccess';

function ShopContent() {
  const { isMerchOnly } = useAgeAccess();
  return <ShopSection merchOnly={isMerchOnly} />;
}

export default function ShopPage() {
  return (
    <SiteLayout>
      <Suspense fallback={<div className="py-32 text-center text-zinc-400">Loading shop...</div>}>
        <ShopContent />
      </Suspense>
    </SiteLayout>
  );
}