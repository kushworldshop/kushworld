export type TrackingCarrier = 'auto' | 'usps' | 'ups' | 'fedex' | 'other';

export interface OrderShippingFields {
  status?: string;
  paymentStatus?: string;
  trackingNumber?: string;
  trackingCarrier?: TrackingCarrier;
  shippedAt?: string;
}

export function normalizeTrackingCarrier(value?: string): TrackingCarrier {
  const carrier = value?.toLowerCase().trim();
  if (carrier === 'usps' || carrier === 'ups' || carrier === 'fedex' || carrier === 'other') {
    return carrier;
  }
  return 'auto';
}

export function detectTrackingCarrier(trackingNumber: string): TrackingCarrier {
  const normalized = trackingNumber.trim().toUpperCase();
  if (normalized.startsWith('1Z')) return 'ups';
  if (/^\d{20,22}$/.test(normalized) || normalized.startsWith('94') || normalized.startsWith('92')) {
    return 'usps';
  }
  if (/^\d{12,15}$/.test(normalized)) return 'fedex';
  return 'usps';
}

export function getTrackingUrl(
  trackingNumber: string,
  carrier: TrackingCarrier = 'auto'
): string | null {
  const number = trackingNumber.trim();
  if (!number) return null;

  const resolved = carrier === 'auto' ? detectTrackingCarrier(number) : carrier;
  if (resolved === 'other') return null;

  const encoded = encodeURIComponent(number);
  if (resolved === 'ups') return `https://www.ups.com/track?tracknum=${encoded}`;
  if (resolved === 'fedex') return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encoded}`;
}

export function getPaymentStatusLabel(paymentStatus?: string): string {
  switch (paymentStatus) {
    case 'paid':
      return 'Paid';
    case 'awaiting_btc':
      return 'Awaiting Bitcoin payment';
    case 'refunded':
      return 'Refunded';
    case 'failed':
      return 'Payment failed';
    default:
      return 'Payment pending';
  }
}

export function getShippingStatusLabel(order: OrderShippingFields): string {
  const status = order.status?.toLowerCase() || 'pending';

  if (status === 'cancelled') return 'Cancelled';
  if (status === 'refunded') return 'Refunded';
  if (status === 'shipped') {
    return order.trackingNumber ? 'Shipped — track your package below' : 'Shipped';
  }
  if (status === 'delivered') return 'Delivered';

  if (status === 'packing' || status === 'sealed' || status === 'quality') {
    return 'Packing & quality check — almost ready to ship';
  }

  if (order.paymentStatus === 'paid' || status === 'processing') {
    return 'Processing — tracking will appear here once your order ships';
  }

  if (order.paymentStatus === 'awaiting_btc') {
    return 'Waiting for payment before processing';
  }

  return 'Awaiting payment';
}

export function customerCanViewShipping(order: OrderShippingFields): boolean {
  if (order.status === 'cancelled' || order.status === 'refunded') return true;
  return order.paymentStatus === 'paid' || order.status === 'processing' || order.status === 'shipped';
}

export function getStatusBadgeTone(
  status?: string,
  paymentStatus?: string
): 'green' | 'yellow' | 'blue' | 'red' | 'zinc' {
  const normalized = status?.toLowerCase();
  if (normalized === 'cancelled' || normalized === 'refunded') return 'red';
  if (normalized === 'shipped' || normalized === 'delivered') return 'green';
  if (normalized === 'packing' || normalized === 'sealed' || normalized === 'quality') return 'green';
  if (paymentStatus === 'paid' || normalized === 'processing') return 'blue';
  if (paymentStatus === 'awaiting_btc') return 'yellow';
  return 'zinc';
}