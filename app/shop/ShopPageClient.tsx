'use client';

import { Suspense } from 'react';
import ShopSection from '@/app/components/ShopSection';
import { useAgeAccess } from '@/lib/useAgeAccess';
import type { Product } from '@/lib/products';

function ShopContent({
  initialCategory,
  merchOnlyPage = false,
  initialProducts,
}: {
  initialCategory?: string;
  merchOnlyPage?: boolean;
  initialProducts?: Product[];
}) {
  const { isMerchOnly } = useAgeAccess();
  return (
    <ShopSection
      merchOnly={merchOnlyPage || isMerchOnly}
      initialCategory={initialCategory}
      initialProducts={initialProducts}
    />
  );
}

export default function ShopPageClient({
  initialCategory,
  merchOnly = false,
  initialProducts,
}: {
  initialCategory?: string;
  merchOnly?: boolean;
  initialProducts?: Product[];
}) {
  return (
    <Suspense fallback={<div className="py-32 text-center text-zinc-400">Loading shop...</div>}>
      <ShopContent
        initialCategory={initialCategory}
        merchOnlyPage={merchOnly}
        initialProducts={initialProducts}
      />
    </Suspense>
  );
}