'use client';

import { useMemo } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { getFreeShippingProgress, type ShippingThresholds } from '@/lib/shipping';
import { useSiteContent } from '@/lib/useSiteContent';

export default function FreeShippingProgress({ className = '' }: { className?: string }) {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal());
  const { content } = useSiteContent();

  const thresholds: ShippingThresholds = useMemo(
    () => ({
      hemp: content.shipping.freeShippingThresholdHemp,
      merch: content.shipping.freeShippingThresholdMerch,
    }),
    [content.shipping.freeShippingThresholdHemp, content.shipping.freeShippingThresholdMerch]
  );

  const progress = useMemo(
    () => getFreeShippingProgress(subtotal, items, thresholds),
    [subtotal, items, thresholds]
  );

  if (items.length === 0) return null;

  const hasMerch = items.some((item) => item.category === 'merch');
  const hasHemp = items.some((item) => item.category && item.category !== 'merch');
  const label =
    hasMerch && !hasHemp
      ? `Free merch shipping at $${thresholds.merch}+`
      : `Free shipping at $${thresholds.hemp}+`;

  return (
    <div className={className}>
      <div className="flex justify-between items-center text-xs mb-2">
        <span className="text-zinc-400">{label}</span>
        <span className={progress.qualified ? 'text-[#00ff9d] font-semibold' : 'text-zinc-300'}>
          {progress.qualified ? 'Unlocked!' : `$${progress.remaining.toFixed(2)} to go`}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#00ff9d] rounded-full transition-all duration-500"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}