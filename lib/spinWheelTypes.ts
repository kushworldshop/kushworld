export const SPIN_COST = 150;
export const PRIZE_EXPIRY_DAYS = 14;

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
  expiresAt: string;
  usedAt?: string;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 'try_again', label: 'Try Again', color: '#52525b', weight: 28, type: 'try_again' },
  { id: 'bonus_50', label: '+50 Points', color: '#3b82f6', weight: 18, type: 'bonus_points', value: 50 },
  { id: 'ten_off', label: '10% Off', color: '#eab308', weight: 16, type: 'percent_off_10', value: 10 },
  { id: 'five_off', label: '$5 Off', color: '#f97316', weight: 14, type: 'fixed_5_off', value: 5 },
  { id: 'free_ship', label: 'Free Shipping', color: '#22c55e', weight: 10, type: 'free_shipping' },
  { id: 'twenty_off', label: '20% Off', color: '#a855f7', weight: 8, type: 'percent_off_20', value: 20 },
  { id: 'free_shirt', label: 'Free T-Shirt', color: '#ec4899', weight: 4, type: 'free_tshirt' },
  { id: 'bonus_100', label: '+100 Points', color: '#06b6d4', weight: 2, type: 'bonus_points', value: 100 },
];

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
  if (!prize || prize.usedAt) return false;
  return new Date(prize.expiresAt).getTime() > Date.now();
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