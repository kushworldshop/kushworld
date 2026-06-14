export const SPIN_COST = 150;
export const PRIZE_EXPIRY_DAYS = 7;

export function buildPrizeExpiryDate(from = new Date()): string {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + PRIZE_EXPIRY_DAYS);
  return expires.toISOString();
}

export function isCouponPrizeType(type: SpinPrizeType): boolean {
  return type !== 'try_again' && type !== 'bonus_points';
}

export type SpinCouponSlot = 'percent_off' | 'fixed_off' | 'free_shipping' | 'free_tshirt';

export function getSpinCouponSlot(type: SpinPrizeType): SpinCouponSlot | null {
  switch (type) {
    case 'percent_off_10':
    case 'percent_off_20':
      return 'percent_off';
    case 'fixed_5_off':
      return 'fixed_off';
    case 'free_shipping':
      return 'free_shipping';
    case 'free_tshirt':
      return 'free_tshirt';
    default:
      return null;
  }
}

export function getPercentOffValue(prize: Pick<SpinPrize, 'type' | 'value'>): number {
  if (prize.type === 'percent_off_20') return prize.value ?? 20;
  if (prize.type === 'percent_off_10') return prize.value ?? 10;
  return prize.value ?? 0;
}

export function isBetterPercentCoupon(
  incoming: Pick<SpinPrize, 'type' | 'value'>,
  existing: Pick<SpinPrize, 'type' | 'value'>
): boolean {
  return getPercentOffValue(incoming) > getPercentOffValue(existing);
}

export function getActiveSavedSpinCoupons(
  coupons: SpinPrize[] | null | undefined
): SpinPrize[] {
  return (coupons ?? []).filter(isSpinPrizeActive);
}

export type SpinPrizeType =
  | 'try_again'
  | 'bonus_points'
  | 'percent_off_10'
  | 'fixed_5_off'
  | 'free_shipping'
  | 'percent_off_20'
  | 'free_tshirt';

export interface WheelSegment {
  id: string;
  label: string;
  color: string;
  weight: number;
  type: SpinPrizeType;
  value?: number;
}

export interface SpinPrize {
  id: string;
  segmentId: string;
  type: SpinPrizeType;
  label: string;
  value?: number;
  wonAt: string;
  acceptedAt?: string;
  expiresAt?: string;
  usedAt?: string;
}

/** Weights use a 1000-point pool (slot-style RTP). Higher weight = more common outcome. */
export const WHEEL_WEIGHT_POOL = 1000;

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 'try_again', label: 'Try Again', color: '#52525b', weight: 460, type: 'try_again' },
  { id: 'bonus_50', label: '+50 Points', color: '#3b82f6', weight: 220, type: 'bonus_points', value: 50 },
  { id: 'five_off', label: '$5 Off', color: '#f97316', weight: 130, type: 'fixed_5_off', value: 5 },
  { id: 'ten_off', label: '10% Off', color: '#eab308', weight: 90, type: 'percent_off_10', value: 10 },
  { id: 'free_ship', label: 'Free Shipping', color: '#22c55e', weight: 55, type: 'free_shipping' },
  { id: 'twenty_off', label: '20% Off', color: '#a855f7', weight: 32, type: 'percent_off_20', value: 20 },
  { id: 'bonus_100', label: '+100 Points', color: '#06b6d4', weight: 10, type: 'bonus_points', value: 100 },
  { id: 'free_shirt', label: 'Free T-Shirt', color: '#ec4899', weight: 3, type: 'free_tshirt' },
];

export function getTotalWheelWeight(): number {
  return WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
}

export function getWheelSegmentOddsPercent(segment: WheelSegment): number {
  const total = getTotalWheelWeight();
  if (total <= 0) return 0;
  return Math.round((segment.weight / total) * 1000) / 10;
}

export function formatWheelOdds(segment: WheelSegment): string {
  const pct = getWheelSegmentOddsPercent(segment);
  if (pct >= 1) return `${pct}%`;
  if (pct >= 0.1) return `${pct}%`;
  return '<0.1%';
}

export function getSegmentIndex(segmentId: string): number {
  return WHEEL_SEGMENTS.findIndex((s) => s.id === segmentId);
}

/** Pointer is fixed at the top; segments are laid out clockwise from 12 o'clock. */
export function getWheelRotationDelta(segmentId: string, currentRotation = 0): number {
  const index = getSegmentIndex(segmentId);
  if (index < 0) return 0;

  const segmentAngle = 360 / WHEEL_SEGMENTS.length;
  const segmentCenter = index * segmentAngle + segmentAngle / 2;
  const jitter = (Math.random() - 0.5) * segmentAngle * 0.55;
  const targetCenter = segmentCenter + jitter;

  const fullSpins = 5 + Math.floor(Math.random() * 4);
  const currentMod = ((currentRotation % 360) + 360) % 360;
  const align = (360 - targetCenter - currentMod + 360) % 360;

  return fullSpins * 360 + align;
}

/** @deprecated Use getWheelRotationDelta — kept for compatibility */
export function getWheelRotation(segmentId: string): number {
  return getWheelRotationDelta(segmentId, 0);
}

export function computeSpinPrizeDiscount(prize: SpinPrize, subtotal: number): number {
  switch (prize.type) {
    case 'percent_off_10':
      return Math.round(subtotal * ((prize.value ?? 10) / 100) * 100) / 100;
    case 'percent_off_20':
      return Math.round(subtotal * ((prize.value ?? 20) / 100) * 100) / 100;
    case 'fixed_5_off':
      return Math.min(prize.value ?? 5, subtotal);
    case 'free_shipping':
    case 'free_tshirt':
    case 'try_again':
    case 'bonus_points':
    default:
      return 0;
  }
}

export function isSpinPrizeActive(prize: SpinPrize | null | undefined): boolean {
  if (!prize || prize.usedAt || !prize.expiresAt) return false;
  return new Date(prize.expiresAt).getTime() > Date.now();
}

export function getSpinPrizeDaysRemaining(prize: SpinPrize | null | undefined): number | null {
  if (!isSpinPrizeActive(prize) || !prize?.expiresAt) return null;
  const ms = new Date(prize.expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function computeSpinPrizePreview(
  prize: SpinPrize | null | undefined,
  subtotal: number,
  usePrize: boolean
): { spinDiscount: number; freeShipping: boolean; freeTshirt: boolean } {
  if (!usePrize || !isSpinPrizeActive(prize) || !prize) {
    return { spinDiscount: 0, freeShipping: false, freeTshirt: false };
  }

  return {
    spinDiscount: computeSpinPrizeDiscount(prize, subtotal),
    freeShipping: prize.type === 'free_shipping',
    freeTshirt: prize.type === 'free_tshirt',
  };
}