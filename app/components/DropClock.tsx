'use client';

import { useEffect, useState } from 'react';
import type { DropHeroConfig } from '@/lib/dropClock';
import {
  getDropClockRemainingMs,
  isDropClockLive,
  isDropClockVisible,
  splitDropClock,
} from '@/lib/dropClock';

function Unit({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 min-w-[4.5rem] bg-black border border-zinc-800 rounded-2xl px-3 py-3 text-center">
      <p className="text-2xl md:text-3xl font-bold text-[#00ff9d] tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-2">{label}</p>
    </div>
  );
}

export default function DropClock({ drop }: { drop: DropHeroConfig }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isDropClockVisible(drop) || !drop.clockRunning) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [drop.clockEnabled, drop.clockRunning, drop.clockEndsAt, drop.enabled]);

  if (!isDropClockVisible(drop)) return null;

  const remaining = getDropClockRemainingMs(drop, now);
  const parts = splitDropClock(remaining);
  const live = isDropClockLive(drop, now);

  return (
    <div className="bg-black border border-[#00ff9d]/25 rounded-3xl p-5 mb-6">
      <p className="text-xs uppercase tracking-[0.25em] text-[#00ff9d] mb-3">
        {live ? 'Live now' : drop.clockLabel || 'Goes live in'}
      </p>
      {live ? (
        <p className="text-2xl font-bold">On the board. Shop it.</p>
      ) : (
        <div className="flex gap-2">
          {parts.days > 0 && <Unit label="Days" value={parts.days} />}
          <Unit label="Hrs" value={parts.hours} />
          <Unit label="Min" value={parts.minutes} />
          <Unit label="Sec" value={parts.seconds} />
        </div>
      )}
    </div>
  );
}
