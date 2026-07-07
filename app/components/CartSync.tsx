'use client';

import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '@/lib/cartStore';

const SYNC_DELAY_MS = 1500;

export default function CartSync() {
  const items = useCartStore((state) => state.items);
  const [hydrated, setHydrated] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayloadRef = useRef('');

  useEffect(() => {
    const persist = useCartStore.persist;
    if (!persist) {
      setHydrated(true);
      return;
    }

    if (persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    const unsub = persist.onFinishHydration(() => setHydrated(true));
    persist.rehydrate();
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const payload = JSON.stringify(items);
    if (payload === lastPayloadRef.current) return;
    lastPayloadRef.current = payload;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (items.length === 0) {
        fetch('/api/cart', { method: 'DELETE' }).catch(() => {});
        return;
      }

      fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }).catch(() => {});
    }, SYNC_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [items, hydrated]);

  return null;
}