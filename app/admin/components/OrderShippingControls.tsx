'use client';

import { useEffect, useState } from 'react';
import { normalizeTrackingCarrier, type TrackingCarrier } from '@/lib/orderShipping';

export default function OrderShippingControls({
  order,
  onUpdated,
}: {
  order: {
    id: string;
    status?: string;
    trackingNumber?: string;
    trackingCarrier?: string;
    shippedAt?: string;
    shippingNotificationSentAt?: string;
    trackingNotificationSentAt?: string;
  };
  onUpdated: () => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [trackingCarrier, setTrackingCarrier] = useState<TrackingCarrier>(
    normalizeTrackingCarrier(order.trackingCarrier)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setTrackingNumber(order.trackingNumber || '');
    setTrackingCarrier(normalizeTrackingCarrier(order.trackingCarrier));
  }, [order.id, order.trackingNumber, order.trackingCarrier]);

  const patchOrder = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      if (data.shippingEmailSent) {
        setMessage('Saved — shipping email sent to customer');
      } else if (data.shippingEmailError) {
        setMessage(`Saved, but email failed: ${data.shippingEmailError}`);
      } else {
        setMessage('Saved');
      }
      onUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-black/40 border border-zinc-800 rounded-2xl p-5 mb-6">
      <p className="text-sm font-semibold mb-3">Shipping & Tracking</p>
      {order.shippedAt && (
        <p className="text-xs text-zinc-500 mb-3">
          Shipped {new Date(order.shippedAt).toLocaleString()}
        </p>
      )}
      {order.shippingNotificationSentAt && (
        <p className="text-xs text-[#00ff9d] mb-3">
          Shipping email sent {new Date(order.shippingNotificationSentAt).toLocaleString()}
        </p>
      )}
      <div className="grid md:grid-cols-[1fr_160px] gap-3 mb-3">
        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          placeholder="Tracking number"
          className="bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono"
        />
        <select
          value={trackingCarrier}
          onChange={(e) => setTrackingCarrier(e.target.value as TrackingCarrier)}
          className="bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm"
        >
          <option value="auto">Auto-detect carrier</option>
          <option value="usps">USPS</option>
          <option value="ups">UPS</option>
          <option value="fedex">FedEx</option>
          <option value="other">Other (no track link)</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            patchOrder({
              status: 'shipped',
              trackingNumber: trackingNumber.trim(),
              trackingCarrier,
            })
          }
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Mark Shipped & Save Tracking'}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            patchOrder({
              trackingNumber: trackingNumber.trim(),
              trackingCarrier,
            })
          }
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm disabled:opacity-50"
        >
          Save Tracking Only
        </button>
      </div>
      {message && (
        <p className={`text-xs mt-2 ${message === 'Saved' ? 'text-[#00ff9d]' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}