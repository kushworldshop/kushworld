'use client';

import { Suspense } from 'react';
import ShopSection from '@/app/components/ShopSection';
import { useAgeAccess } from '@/lib/useAgeAccess';

function ShopContent({
  initialCategory,
  merchOnlyPage = false,
}: {
  initialCategory?: string;
  merchOnlyPage?: boolean;
}) {
  const { isMerchOnly } = useAgeAccess();
  return (
    <ShopSection
      merchOnly={merchOnlyPage || isMerchOnly}
      initialCategory={initialCategory}
    />
  );
}

export default function ShopPageClient({
  initialCategory,
  merchOnly = false,
}: {
  initialCategory?: string;
  merchOnly?: boolean;
}) {
  return (
    <Suspense fallback={<div className="py-32 text-center text-zinc-400">Loading shop...</div>}>
      <ShopContent initialCategory={initialCategory} merchOnlyPage={merchOnly} />
    </Suspense>
  );
}