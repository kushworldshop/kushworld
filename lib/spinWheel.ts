import { getSiteContent } from '@/lib/siteContent';
import {
  SPIN_COST,
  WHEEL_SEGMENTS,
  buildPrizeExpiryDate,
  computeSpinPrizeDiscount,
  isSpinPrizeActive,
  type SpinPrize,
  type WheelSegment,
} from '@/lib/spinWheelTypes';
import {
  markSpinHistoryAccepted,
  markSpinHistoryForfeited,
  recordSpinHistory,
} from '@/lib/spinWheelHistory';
import {
  addLoyaltyPoints,
  clearActiveSpinPrize,
  clearPendingSpinPrize,
  getRedeemableLoyaltyPoints,
  getUserById,
  redeemLoyaltyPoints,
  setActiveSpinPrize,
  setPendingSpinPrize,
  type UserProfile,
} from '@/lib/users';

function secureUnitRandom(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] / 0x1_0000_0000;
  }
  return Math.random();
}

function pickWeightedSegment(): WheelSegment {
  const totalWeight = WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
  let roll = secureUnitRandom() * totalWeight;

  for (const segment of WHEEL_SEGMENTS) {
    roll -= segment.weight;
    if (roll <= 0) return segment;
  }

  return WHEEL_SEGMENTS[WHEEL_SEGMENTS.length - 1];
}

function buildPendingPrizeFromSegment(segment: WheelSegment): SpinPrize {
  const now = new Date();

  return {
    id: `prize_${Date.now()}`,
    segmentId: segment.id,
    type: segment.type,
    label: segment.label,
    value: segment.value,
    wonAt: now.toISOString(),
  };
}

export function getPendingSpinPrize(user: UserProfile): SpinPrize | null {
  return user.pendingSpinPrize ?? null;
}

export function getActiveSpinPrize(user: UserProfile): SpinPrize | null {
  const prize = user.activeSpinPrize;
  return isSpinPrizeActive(prize) ? prize! : null;
}

export function hasOpenWheelPrize(user: UserProfile): boolean {
  return !!getPendingSpinPrize(user) || !!getActiveSpinPrize(user);
}

export async function acceptSpinPrize(userId: string): Promise<SpinPrize> {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const pending = getPendingSpinPrize(user);
  if (!pending) throw new Error('No prize waiting to accept');

  if (getActiveSpinPrize(user)) {
    throw new Error('You already have an active wheel coupon. Use or forfeit it first.');
  }

  const acceptedAt = new Date().toISOString();
  const expiresAt = buildPrizeExpiryDate();
  const accepted: SpinPrize = {
    ...pending,
    acceptedAt,
    expiresAt,
  };

  await setActiveSpinPrize(userId, accepted);
  await clearPendingSpinPrize(userId);
  await markSpinHistoryAccepted(pending.id, expiresAt);

  return accepted;
}

export async function forfeitSpinPrize(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const pending = getPendingSpinPrize(user);
  const active = getActiveSpinPrize(user);
  const prizeId = pending?.id ?? active?.id;

  if (pending) {
    await clearPendingSpinPrize(userId);
  }
  if (active) {
    await clearActiveSpinPrize(userId);
  }

  if (prizeId) {
    await markSpinHistoryForfeited(prizeId);
  }
}

async function getSpinCost(): Promise<number> {
  const content = await getSiteContent();
  if (!content.features.spinWheel.enabled) {
    throw new Error('Spin wheel is currently disabled');
  }
  return content.features.spinWheel.spinCost || SPIN_COST;
}

export async function spinWheel(userId: string): Promise<{
  segment: WheelSegment;
  prize: SpinPrize | null;
  instantBonusPoints: number;
  pointsSpent: number;
  remainingPoints: number;
  message: string;
}> {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  if (hasOpenWheelPrize(user)) {
    throw new Error('Accept or forfeit your current wheel prize before spinning again');
  }

  const spinCost = await getSpinCost();

  if (getRedeemableLoyaltyPoints(user) < spinCost) {
    const locked = user.lockedLoyaltyPoints ?? 0;
    throw new Error(
      locked > 0
        ? `Need ${spinCost} redeemable points to spin. Signup bonus points unlock after your first purchase.`
        : `Need ${spinCost} points to spin`
    );
  }

  const redeemed = await redeemLoyaltyPoints(userId, spinCost);
  if (!redeemed.success) {
    throw new Error(redeemed.error || `Need ${spinCost} points to spin`);
  }

  const segment = pickWeightedSegment();
  let instantBonusPoints = 0;
  let prize: SpinPrize | null = null;
  let message = '';

  if (segment.type === 'try_again') {
    message = 'No luck this time — try again!';
  } else if (segment.type === 'bonus_points' && segment.value) {
    instantBonusPoints = segment.value;
    await addLoyaltyPoints(userId, segment.value);
    message = `You won ${segment.value} bonus points!`;
  } else {
    prize = buildPendingPrizeFromSegment(segment);
    await setPendingSpinPrize(userId, prize);
    message = `You won: ${segment.label}! Accept to save it for 7 days, or forfeit to spin again.`;
  }

  if (segment.type === 'try_again') {
    await recordSpinHistory({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      pointsSpent: spinCost,
      segmentId: segment.id,
      segmentLabel: segment.label,
      prizeType: segment.type,
      status: 'no_prize',
    });
  } else if (segment.type === 'bonus_points') {
    await recordSpinHistory({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      pointsSpent: spinCost,
      segmentId: segment.id,
      segmentLabel: segment.label,
      prizeType: segment.type,
      instantBonusPoints,
      status: 'instant_points',
    });
  } else if (prize) {
    await recordSpinHistory({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      pointsSpent: spinCost,
      segmentId: segment.id,
      segmentLabel: segment.label,
      prizeType: segment.type,
      prizeId: prize.id,
      prizeLabel: prize.label,
      status: 'awaiting_accept',
    });
  }

  const updated = await getUserById(userId);

  return {
    segment,
    prize,
    instantBonusPoints,
    pointsSpent: spinCost,
    remainingPoints: updated ? getRedeemableLoyaltyPoints(updated) : redeemed.remaining,
    message,
  };
}

export async function validateSpinPrizeForCheckout(
  userId: string | null,
  prizeId: string | undefined,
  subtotal: number
): Promise<{
  prize: SpinPrize;
  spinDiscount: number;
  freeShipping: boolean;
  freeTshirt: boolean;
}> {
  if (!prizeId) {
    throw new Error('No spin prize specified');
  }

  if (!userId) {
    throw new Error('Login required to use wheel prizes');
  }

  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const prize = getActiveSpinPrize(user);
  if (!prize || prize.id !== prizeId) {
    throw new Error('Wheel prize is invalid or expired');
  }

  return {
    prize,
    spinDiscount: computeSpinPrizeDiscount(prize, subtotal),
    freeShipping: prize.type === 'free_shipping',
    freeTshirt: prize.type === 'free_tshirt',
  };
}