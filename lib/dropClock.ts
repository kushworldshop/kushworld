import type { SiteFeatures } from '@/lib/featureTypes';

export type DropHeroConfig = SiteFeatures['dropHero'];

export const DROP_CLOCK_PRESETS: { label: string; ms: number }[] = [
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '6 hours', ms: 6 * 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { label: '3 days', ms: 3 * 24 * 60 * 60 * 1000 },
  { label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
];

export function getDropClockRemainingMs(drop: DropHeroConfig, now = Date.now()): number {
  if (!drop.clockRunning) {
    return Math.max(0, drop.clockFrozenMs ?? 0);
  }
  const end = Date.parse(drop.clockEndsAt || '');
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - now);
}

/** Clock shows only when the drop block is on and the clock itself is enabled. */
export function isDropClockVisible(drop: DropHeroConfig): boolean {
  return Boolean(drop.enabled && drop.clockEnabled);
}

export function isDropClockLive(drop: DropHeroConfig, now = Date.now()): boolean {
  return isDropClockVisible(drop) && drop.clockRunning && getDropClockRemainingMs(drop, now) <= 0;
}

export function splitDropClock(ms: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
} {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
  };
}

export function formatDropClockRemaining(ms: number): string {
  const { days, hours, minutes, seconds } = splitDropClock(ms);
  if (ms <= 0) return '0s';
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function toDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string {
  if (!value.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function resolveDropClockEndMs(drop: DropHeroConfig, now: number): number | null {
  if (typeof drop.clockFrozenMs === 'number' && drop.clockFrozenMs > 0) {
    return now + drop.clockFrozenMs;
  }
  const end = Date.parse(drop.clockEndsAt || '');
  if (Number.isFinite(end) && end > now) return end;
  return null;
}

export function applyStartDropClock(
  drop: DropHeroConfig,
  now = Date.now()
): { drop: DropHeroConfig; error?: string } {
  const endMs = resolveDropClockEndMs(drop, now);
  if (endMs == null) {
    return { drop, error: 'Set an end time or pick a duration first.' };
  }
  return {
    drop: {
      ...drop,
      enabled: true,
      clockEnabled: true,
      clockRunning: true,
      clockEndsAt: new Date(endMs).toISOString(),
      clockFrozenMs: null,
    },
  };
}

export function applyStopDropClock(drop: DropHeroConfig, now = Date.now()): DropHeroConfig {
  return {
    ...drop,
    clockRunning: false,
    clockFrozenMs: getDropClockRemainingMs(drop, now),
  };
}

export function applyLiveDropClock(drop: DropHeroConfig, now = Date.now()): DropHeroConfig {
  return {
    ...drop,
    enabled: true,
    clockEnabled: true,
    clockRunning: true,
    clockEndsAt: new Date(now).toISOString(),
    clockFrozenMs: null,
  };
}

export function applyDropClockDuration(
  drop: DropHeroConfig,
  durationMs: number,
  now = Date.now()
): DropHeroConfig {
  const endsAt = new Date(now + durationMs).toISOString();
  if (drop.clockRunning) {
    return { ...drop, clockEndsAt: endsAt, clockFrozenMs: null };
  }
  return { ...drop, clockEndsAt: endsAt, clockFrozenMs: durationMs };
}

export function applyDropClockEndAt(
  drop: DropHeroConfig,
  iso: string,
  now = Date.now()
): DropHeroConfig {
  const end = Date.parse(iso || '');
  const remaining = Number.isFinite(end) ? Math.max(0, end - now) : 0;
  if (drop.clockRunning) {
    return { ...drop, clockEndsAt: iso, clockFrozenMs: null };
  }
  return { ...drop, clockEndsAt: iso, clockFrozenMs: remaining };
}
