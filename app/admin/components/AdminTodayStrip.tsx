'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import type { AdminTodayItem, AdminTodayItemId, AdminTodayTab } from '@/lib/adminToday';

export default function AdminTodayStrip({
  activeFocus,
  onSelect,
}: {
  activeFocus: AdminTodayItemId | null;
  onSelect: (item: { id: AdminTodayItemId; tab: AdminTodayTab }) => void;
}) {
  const [items, setItems] = useState<AdminTodayItem[]>([]);
  const [waiting, setWaiting] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/today');
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setWaiting(Number(data.waiting) || 0);
    } catch {
      // keep last snapshot
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 45000);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const visible = items.filter((item) => item.count > 0);

  return (
    <div className="flex items-center gap-1 overflow-x-auto px-2 sm:px-3 pb-2">
      {visible.length === 0 ? (
        <p className="text-[11px] text-zinc-600 px-1 py-1.5">All clear</p>
      ) : (
        <>
          <p className="shrink-0 text-[11px] uppercase tracking-wider text-zinc-500 px-1">
            Today{waiting > 0 ? ` · ${waiting}` : ''}
          </p>
          {visible.map((item) => {
            const active = activeFocus === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect({ id: item.id, tab: item.tab })}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? 'bg-[#00ff9d] text-black'
                    : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-[#00ff9d]/40'
                }`}
              >
                <span className={`tabular-nums font-bold ${active ? 'text-black' : 'text-[#00ff9d]'}`}>
                  {item.count}
                </span>
                {item.label}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}
