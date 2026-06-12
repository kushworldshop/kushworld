'use client';

import { useEffect, useState } from 'react';
import { StarDisplay } from './StarRating';

const statsCache = new Map<string, { average: number; count: number }>();

export default function ProductRatingBadge({
  productId,
  size = 'sm',
}: {
  productId: string;
  size?: 'sm' | 'md';
}) {
  const cached = statsCache.get(productId);
  const [stats, setStats] = useState(cached ?? null);

  useEffect(() => {
    if (cached) return;

    let cancelled = false;
    fetch(`/api/reviews?productId=${productId}&stats=true`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const next = {
          average: data.stats?.average ?? 0,
          count: data.stats?.count ?? 0,
        };
        if (next.count > 0) {
          statsCache.set(productId, next);
          setStats(next);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [productId, cached]);

  if (!stats || stats.count === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <StarDisplay rating={stats.average} size={size} />
      <span className="text-zinc-500">
        {stats.average.toFixed(1)} ({stats.count})
      </span>
    </div>
  );
}