'use client';

import {
  customerCanViewShipping,
  getPaymentStatusLabel,
  getShippingStatusLabel,
  getStatusBadgeTone,
  getTrackingUrl,
  normalizeTrackingCarrier,
  type OrderShippingFields,
} from '@/lib/orderShipping';

export default function OrderShippingStatus({ order }: { order: OrderShippingFields & { id?: string } }) {
  if (!customerCanViewShipping(order)) return null;

  const paymentLabel = getPaymentStatusLabel(order.paymentStatus);
  const shippingLabel = getShippingStatusLabel(order);
  const badgeTone = getStatusBadgeTone(order.status, order.paymentStatus);
  const trackingUrl = order.trackingNumber
    ? getTrackingUrl(order.trackingNumber, normalizeTrackingCarrier(order.trackingCarrier))
    : null;

  const badgeClass =
    badgeTone === 'green'
      ? 'bg-green-950/50 text-green-400 border-green-900'
      : badgeTone === 'blue'
        ? 'bg-blue-950/50 text-blue-300 border-blue-900'
        : badgeTone === 'yellow'
          ? 'bg-yellow-950/50 text-yellow-400 border-yellow-900'
          : badgeTone === 'red'
            ? 'bg-red-950/50 text-red-400 border-red-900'
            : 'bg-zinc-800 text-zinc-300 border-zinc-700';

  return (
    <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs uppercase px-3 py-1 rounded-full border ${badgeClass}`}>
          {order.status || 'pending'}
        </span>
        <span className="text-xs text-zinc-500">{paymentLabel}</span>
      </div>

      <p className="text-sm text-zinc-300">{shippingLabel}</p>

      {order.shippedAt && (
        <p className="text-xs text-zinc-500">
          Shipped {new Date(order.shippedAt).toLocaleString()}
        </p>
      )}

      {order.trackingNumber && (
        <div className="bg-black/50 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Tracking number</p>
          <p className="font-mono text-sm text-[#00ff9d] break-all">{order.trackingNumber}</p>
          {trackingUrl ? (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-sm text-white underline hover:text-[#00ff9d]"
            >
              Track package →
            </a>
          ) : (
            <p className="text-xs text-zinc-500 mt-2">
              Carrier: {normalizeTrackingCarrier(order.trackingCarrier) === 'other' ? 'Other' : 'See carrier site'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}