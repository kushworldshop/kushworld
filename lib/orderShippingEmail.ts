import { sendShippingNotification, type ShippingEmailKind } from '@/lib/email';
import {
  getTrackingUrl,
  normalizeTrackingCarrier,
  type OrderShippingFields,
} from '@/lib/orderShipping';

type OrderRecord = OrderShippingFields & {
  id: string;
  email?: string;
  name?: string;
  customer?: { email?: string; name?: string };
  shippingNotificationSentAt?: string;
  trackingNotificationSentAt?: string;
};

function carrierLabel(carrier?: string): string | undefined {
  const normalized = normalizeTrackingCarrier(carrier);
  if (normalized === 'usps') return 'USPS';
  if (normalized === 'ups') return 'UPS';
  if (normalized === 'fedex') return 'FedEx';
  if (normalized === 'other') return 'Other';
  return undefined;
}

export function resolveShippingEmailAction(
  previous: OrderRecord,
  next: OrderRecord
): ShippingEmailKind | null {
  const email = next.customer?.email || next.email;
  if (!email || next.status !== 'shipped') return null;

  const tracking = next.trackingNumber?.trim();
  const prevTracking = previous.trackingNumber?.trim() || '';
  const becameShipped = next.status === 'shipped' && previous.status !== 'shipped';
  const trackingAdded = !!tracking && tracking !== prevTracking;

  if (!previous.shippingNotificationSentAt && becameShipped) {
    return 'shipped';
  }

  if (
    trackingAdded &&
    previous.shippingNotificationSentAt &&
    !previous.trackingNotificationSentAt &&
    !prevTracking
  ) {
    return 'tracking_update';
  }

  return null;
}

export async function maybeSendShippingEmail(
  previous: OrderRecord,
  next: OrderRecord
): Promise<{ sent: boolean; kind?: ShippingEmailKind; error?: string }> {
  const kind = resolveShippingEmailAction(previous, next);
  if (!kind) return { sent: false };

  const email = next.customer?.email || next.email;
  if (!email) return { sent: false };

  const tracking = next.trackingNumber?.trim();
  const carrier = normalizeTrackingCarrier(next.trackingCarrier);
  const result = await sendShippingNotification(
    email,
    {
      id: next.id,
      name: next.customer?.name || next.name,
      trackingNumber: tracking,
      trackingUrl: tracking ? getTrackingUrl(tracking, carrier) : null,
      carrierLabel: carrierLabel(next.trackingCarrier),
    },
    kind
  );

  if (result.sent) {
    return { sent: true, kind };
  }

  if (result.stub) {
    return { sent: false, kind, error: 'Email not configured (dev stub only)' };
  }

  return { sent: false, kind, error: result.error || 'Failed to send email' };
}

export function applyShippingEmailTimestamps(
  order: OrderRecord,
  kind: ShippingEmailKind
): OrderRecord {
  const now = new Date().toISOString();
  if (kind === 'shipped') {
    return {
      ...order,
      shippingNotificationSentAt: now,
      ...(order.trackingNumber?.trim() ? { trackingNotificationSentAt: now } : {}),
    };
  }
  return { ...order, trackingNotificationSentAt: now };
}