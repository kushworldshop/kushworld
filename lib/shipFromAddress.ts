import type { BtcPostageAddress } from '@/lib/btcPostage';
import { getBtcPostageConfig } from '@/lib/btcPostage';

export function normalizeShipFromInput(input?: Partial<BtcPostageAddress> | null): BtcPostageAddress {
  return {
    name: String(input?.name || '').trim() || 'Kush World',
    street: String(input?.street || '').trim(),
    street2: String(input?.street2 || '').trim() || undefined,
    city: String(input?.city || '').trim(),
    state: String(input?.state || '').trim().toUpperCase(),
    zip: String(input?.zip || '').trim(),
    country: String(input?.country || 'US').trim() || 'US',
    phone: String(input?.phone || '').trim(),
  };
}

export function isShipFromComplete(address: BtcPostageAddress): boolean {
  return Boolean(address.street && address.city && address.state && address.zip);
}

export function resolveShipFrom(input?: Partial<BtcPostageAddress> | null): {
  address: BtcPostageAddress;
  complete: boolean;
  source: 'request' | 'env' | 'empty';
} {
  const normalized = normalizeShipFromInput(input);
  if (isShipFromComplete(normalized)) {
    return { address: normalized, complete: true, source: 'request' };
  }

  const envFrom = getBtcPostageConfig().shipFrom;
  if (isShipFromComplete(envFrom)) {
    return { address: envFrom, complete: true, source: 'env' };
  }

  return { address: normalized, complete: false, source: 'empty' };
}

export function formatShipFromLine(address: BtcPostageAddress): string {
  const line2 = address.street2 ? `, ${address.street2}` : '';
  return `${address.name} — ${address.street}${line2}, ${address.city}, ${address.state} ${address.zip}`;
}