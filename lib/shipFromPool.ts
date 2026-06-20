import fs from 'fs/promises';
import path from 'path';
import type { BtcPostageAddress } from '@/lib/btcPostage';
import { getBtcPostageConfig } from '@/lib/btcPostage';
import { isShipFromComplete, normalizeShipFromInput } from '@/lib/shipFromAddress';

export interface ShipFromPoolEntry extends BtcPostageAddress {
  id: string;
  label?: string;
  notes?: string;
}

const POOL_FILE = path.join(process.cwd(), 'data', 'ship-from-addresses.json');

let cachedPool: ShipFromPoolEntry[] | null = null;
let cacheTime = 0;
const CACHE_MS = 30_000;

function entryFromEnv(): ShipFromPoolEntry | null {
  const envFrom = getBtcPostageConfig().shipFrom;
  if (!isShipFromComplete(envFrom)) return null;
  return {
    id: 'env-default',
    label: 'Environment default',
    ...envFrom,
  };
}

function normalizeEntry(raw: Record<string, unknown>): ShipFromPoolEntry | null {
  const id = String(raw.id || '').trim();
  if (!id) return null;
  const address = normalizeShipFromInput({
    name: String(raw.name || ''),
    street: String(raw.street || ''),
    street2: String(raw.street2 || '') || undefined,
    city: String(raw.city || ''),
    state: String(raw.state || ''),
    zip: String(raw.zip || ''),
    country: String(raw.country || 'US'),
    phone: String(raw.phone || ''),
  });
  if (!isShipFromComplete(address)) return null;
  return {
    id,
    label: String(raw.label || id),
    notes: raw.notes ? String(raw.notes) : undefined,
    ...address,
  };
}

function parsePoolEnv(): ShipFromPoolEntry[] {
  const raw = process.env.SHIP_FROM_ADDRESSES?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeEntry((item || {}) as Record<string, unknown>))
      .filter((entry): entry is ShipFromPoolEntry => Boolean(entry));
  } catch {
    return [];
  }
}

export async function loadShipFromPool(force = false): Promise<ShipFromPoolEntry[]> {
  const now = Date.now();
  if (!force && cachedPool && now - cacheTime < CACHE_MS) {
    return cachedPool;
  }

  const merged = new Map<string, ShipFromPoolEntry>();

  const envEntry = entryFromEnv();
  if (envEntry) merged.set(envEntry.id, envEntry);

  for (const entry of parsePoolEnv()) {
    merged.set(entry.id, entry);
  }

  try {
    const data = await fs.readFile(POOL_FILE, 'utf8');
    const parsed = JSON.parse(data) as unknown;
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const entry = normalizeEntry((item || {}) as Record<string, unknown>);
        if (entry) merged.set(entry.id, entry);
      }
    }
  } catch {
    // file optional
  }

  cachedPool = Array.from(merged.values());
  cacheTime = now;
  return cachedPool;
}

export function pickShipFromByOrderId(pool: ShipFromPoolEntry[], orderId: string): ShipFromPoolEntry | null {
  if (!pool.length) return null;
  let hash = 0;
  for (let i = 0; i < orderId.length; i += 1) {
    hash = (hash + orderId.charCodeAt(i) * (i + 1)) % pool.length;
  }
  return pool[hash] || pool[0];
}