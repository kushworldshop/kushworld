import type { OrderShippingFields } from './orderShipping';

// Cannabis / hemp themed tracker stages (inspired by Domino's visual step tracker but 100% Kush World style).
// Different vibe: garden-to-door grow journey, discreet ops, 21+ responsible enjoyment. No pizza puns.

export interface TrackerStep {
  key: string;
  index: number;
  label: string;
  shortLabel: string;
  description: string;
  icon: string; // emoji for zero-dependency visuals
  eta: string;
  color: string; // tailwind-ish accent
}

export const KUSH_TRACKER_STEPS: TrackerStep[] = [
  {
    key: 'received',
    index: 0,
    label: 'Order Received',
    shortLabel: 'Received',
    description: 'We got your order. Seeds planted in the system and we\'re reviewing everything.',
    icon: '🌱',
    eta: 'Just now',
    color: '#00ff9d',
  },
  {
    key: 'confirmed',
    index: 1,
    label: 'Confirmed & Verified',
    shortLabel: 'Verified',
    description: 'Payment cleared. Age/ID verified (21+). Your items are approved and queued.',
    icon: '🪴',
    eta: 'Minutes',
    color: '#00ff9d',
  },
  {
    key: 'packing',
    index: 2,
    label: 'Curating & Packing',
    shortLabel: 'Packing',
    description: 'Hand-selecting premium hemp, studio merch, and any free 1/8th bonus. Plain discreet packaging only.',
    icon: '📦',
    eta: '1–4 hours',
    color: '#22c55e',
  },
  {
    key: 'sealed',
    index: 3,
    label: 'Sealed & Quality Checked',
    shortLabel: 'Sealed',
    description: 'COAs attached. Everything triple-checked, sealed, and ready for the low-key handoff.',
    icon: '🔬',
    eta: 'Ready to roll',
    color: '#16a34a',
  },
  {
    key: 'shipped',
    index: 4,
    label: 'Discreetly En Route',
    shortLabel: 'En Route',
    description: 'Shipped in an unmarked package. No Kush World logos. On its way with your carrier.',
    icon: '🚐',
    eta: '1–3 business days',
    color: '#15803d',
  },
  {
    key: 'delivered',
    index: 5,
    label: 'Delivered to Your Spot',
    shortLabel: 'Delivered',
    description: 'Landed safely. Time to enjoy — 21+ only, responsibly. Thanks for growing with us.',
    icon: '🏡',
    eta: 'Complete',
    color: '#166534',
  },
];

export function getTrackerStepFromOrder(order: any): TrackerStep {
  const status = (order?.status || 'pending').toString().toLowerCase();
  const paymentStatus = (order?.paymentStatus || '').toLowerCase();
  const hasShipped = !!order?.shippedAt || status === 'shipped';
  const hasDelivered = !!order?.deliveredAt || status === 'delivered';
  const isPaid = paymentStatus === 'paid' || status === 'processing' || status === 'shipped' || status === 'delivered';

  if (hasDelivered || status === 'delivered') {
    return KUSH_TRACKER_STEPS[5];
  }
  if (hasShipped || status === 'shipped') {
    return KUSH_TRACKER_STEPS[4];
  }
  if (status === 'packing' || status === 'quality' || status === 'sealed') {
    return KUSH_TRACKER_STEPS[3]; // sealed step as catch-all for late prep
  }
  if (status === 'processing' || isPaid) {
    // paid orders are at least packing / curating
    return KUSH_TRACKER_STEPS[2];
  }
  if (status === 'confirmed' || order?.idVerification?.status === 'verified') {
    return KUSH_TRACKER_STEPS[1];
  }
  // default / pending / awaiting payment / new
  return KUSH_TRACKER_STEPS[0];
}

export function getTrackerProgress(order: any): {
  current: TrackerStep;
  currentIndex: number;
  progressPercent: number;
  totalSteps: number;
  etaText: string;
  isComplete: boolean;
} {
  const current = getTrackerStepFromOrder(order);
  const idx = current.index;
  const total = KUSH_TRACKER_STEPS.length;
  const progressPercent = Math.round(((idx + 1) / total) * 100);
  const isComplete = idx === total - 1;

  let etaText = current.eta;
  if (order?.shippedAt && idx >= 4) {
    etaText = 'On the way';
  }
  if (order?.deliveredAt && idx === 5) {
    const d = new Date(order.deliveredAt);
    etaText = `Arrived ${d.toLocaleDateString()}`;
  }

  return {
    current,
    currentIndex: idx,
    progressPercent: Math.max(0, Math.min(100, progressPercent)),
    totalSteps: total,
    etaText,
    isComplete,
  };
}

export function getStepStatus(stepIndex: number, currentIndex: number): 'complete' | 'current' | 'upcoming' {
  if (stepIndex < currentIndex) return 'complete';
  if (stepIndex === currentIndex) return 'current';
  return 'upcoming';
}

// Bonus callout for free eighth (from the auto-free-1/8th feature)
export function hasFreeEighthBonus(order: any): boolean {
  return !!(order?.freeEighthBonus || order?.freeEighthNote);
}

export function getFreeEighthCallout(order: any): string | null {
  if (!hasFreeEighthBonus(order)) return null;
  return order?.freeEighthNote || 'Free 1/8th unlocked with this hemp purchase and now locked in your profile for redemption.';
}

// Simple estimated delivery window (discreet shipping)
export function getEstimatedDelivery(order: any): string {
  if (!order?.createdAt) return '3–7 business days';
  const created = new Date(order.createdAt);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - created.getTime()) / (1000 * 3600 * 24));

  const status = (order.status || '').toLowerCase();
  if (status === 'delivered' || order.deliveredAt) {
    return 'Delivered';
  }
  if (status === 'shipped' || order.shippedAt) {
    return '1–3 business days from ship date';
  }
  if (daysSince >= 2) {
    return 'Arriving soon (1–4 business days)';
  }
  return '3–7 business days from order date';
}

// Admin auto-advance rules for the Kush Tracker stages.
// Returns the next logical status string, or null if no clear forward move.
// Conservative: only advances when conditions are clearly met (paid + verified, etc.).
// Used by admin "Smart Advance" button and optionally in fulfillment flows.
export function getSuggestedNextStatus(order: any): string | null {
  if (!order) return null;
  const status = (order.status || 'pending').toLowerCase();
  const paymentStatus = (order.paymentStatus || '').toLowerCase();
  const idStatus = order.idVerification?.status || '';
  const hasTracking = !!order.trackingNumber?.trim();

  // Already at end
  if (status === 'delivered' || status === 'cancelled' || status === 'refunded') return null;

  // Early: if just paid + id good, move out of pending/received
  if ((status === 'pending' || status === 'received') && paymentStatus === 'paid' && (idStatus === 'verified' || idStatus === '')) {
    return 'packing';
  }

  // From processing/packing -> sealed (QC)
  if (status === 'processing' || status === 'packing') {
    return 'sealed';
  }

  // Sealed -> shipped (admin should usually add tracking at this point, but allow)
  if (status === 'sealed' || status === 'quality') {
    return 'shipped';
  }

  // Shipped -> delivered (manual confirmation usually)
  if (status === 'shipped' && hasTracking) {
    return 'delivered';
  }

  // If paid but still low status, push to packing
  if (paymentStatus === 'paid' && (status === 'pending' || status === 'received' || !status)) {
    return 'packing';
  }

  return null;
}

// Convenience: get the label for the suggested button
export function getSuggestedNextLabel(suggested: string | null): string {
  if (!suggested) return 'No further auto-advance';
  const map: Record<string, string> = {
    packing: 'Advance to Packing',
    sealed: 'Advance to Sealed / QC',
    shipped: 'Mark Shipped (add tracking first)',
    delivered: 'Mark Delivered',
  };
  return map[suggested] || `Advance to ${suggested}`;
}
