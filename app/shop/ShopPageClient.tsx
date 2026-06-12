'use client';

import { Suspense } from 'react';
import ShopSection from '@/app/components/ShopSection';
import { useAgeAccess } from '@/lib/useAgeAccess';

function ShopContent({ initialCategory }: { initialCategory?: string }) {
  const { isMerchOnly } = useAgeAccess();
  return <ShopSection merchOnly={isMerchOnly} initialCategory={initialCategory} />;
}

export default function ShopPageClient({ initialCategory }: { initialCategory?: string }) {
  return (
    <Suspense fallback={<div className="py-32 text-center text-zinc-400">Loading shop...</div>}>
      <ShopContent initialCategory={initialCategory} />
    </Suspense>
  );
}