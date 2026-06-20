import type { BtcPostageAddress } from '@/lib/btcPostage';
import { isXaiConfigured, xaiChatCompletion } from '@/lib/xai';
import { loadShipFromPool, pickShipFromByOrderId, type ShipFromPoolEntry } from '@/lib/shipFromPool';
import { summarizeOrderForGrok, type OrderForShippingValidation } from '@/lib/shippingOrderValidation';

interface GrokShipFromPick {
  addressId?: string;
  reason?: string;
}

function parseJsonFromContent<T>(content: string | null): T | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

export interface GrokShipFromResult {
  address: BtcPostageAddress;
  addressId: string;
  label: string;
  reason: string;
  source: 'grok' | 'fallback';
}

export async function selectGrokShipFrom(
  order: OrderForShippingValidation
): Promise<{ result?: GrokShipFromResult; error?: string }> {
  const pool = await loadShipFromPool();
  if (!pool.length) {
    return {
      error:
        'No ship-from addresses configured. Add entries to data/ship-from-addresses.json or SHIP_FROM_* env vars.',
    };
  }

  if (!isXaiConfigured()) {
    const fallback = pickShipFromByOrderId(pool, order.id);
    if (!fallback) return { error: 'No ship-from addresses available' };
    return {
      result: {
        address: fallback,
        addressId: fallback.id,
        label: fallback.label || fallback.id,
        reason: 'Grok unavailable — rotated address by order id',
        source: 'fallback',
      },
    };
  }

  const orderSummary = summarizeOrderForGrok(order);
  const poolForPrompt = pool.map((entry) => ({
    id: entry.id,
    label: entry.label,
    city: entry.city,
    state: entry.state,
    zip: entry.zip,
    notes: entry.notes,
  }));

  const prompt = `You select the best outgoing ship-from address for a Kush World order.

Return ONLY JSON:
{"addressId": "must be an id from the pool", "reason": "one short sentence"}

Rules:
- Pick a REAL address from the pool only — never invent addresses.
- Rotate / vary outgoing addresses across orders when multiple options exist (discreet shipping).
- Prefer an origin that makes geographic sense vs the destination when possible.
- For hemp/merch, any valid pool address is fine unless notes say otherwise.

Order:
${JSON.stringify(orderSummary, null, 2)}

Address pool:
${JSON.stringify(poolForPrompt, null, 2)}`;

  const content = await xaiChatCompletion({
    messages: [
      {
        role: 'system',
        content: 'You pick ship-from addresses from a fixed pool. JSON only. Never fabricate addresses.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    max_tokens: 200,
  });

  const pick = parseJsonFromContent<GrokShipFromPick>(content);
  let selected: ShipFromPoolEntry | undefined;

  if (pick?.addressId) {
    selected = pool.find((entry) => entry.id === pick.addressId);
  }

  if (!selected) {
    selected = pickShipFromByOrderId(pool, order.id) || pool[0];
  }

  return {
    result: {
      address: selected,
      addressId: selected.id,
      label: selected.label || selected.id,
      reason: pick?.reason || 'Grok selected outgoing address from pool',
      source: pick?.addressId && pool.some((e) => e.id === pick.addressId) ? 'grok' : 'fallback',
    },
  };
}