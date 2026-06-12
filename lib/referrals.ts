import fs from 'fs/promises';
import path from 'path';
import { MIN_ORDER_AMOUNT } from '@/lib/checkout';
import { REFERRER_REWARD_POINTS } from '@/lib/referralConstants';
import { calculateCommissionAmount, getSettings } from '@/lib/settings';

export { REFERRER_REWARD_POINTS };

const REFERRALS_FILE = path.join(process.cwd(), 'data', 'referrals.json');

export interface Referral {
  code: string;
  referrerName: string;
  referrerEmail: string;
  clicks: number;
  conversions: number;
  pointsClaimed: number;
  commissionEarned: number;
  createdAt: string;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function generateCodeSuffix(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function buildReferralCode(name: string): string {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'KUSH';
  return `KW-${slug}${generateCodeSuffix()}`;
}

export function getReferralLink(code: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://kushworld.shop';
  return `${base}/ref/${normalizeCode(code)}`;
}

async function ensureReferralsFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(REFERRALS_FILE);
  } catch {
    await fs.writeFile(REFERRALS_FILE, JSON.stringify([], null, 2));
  }
}

async function readReferrals(): Promise<Referral[]> {
  await ensureReferralsFile();
  const data = await fs.readFile(REFERRALS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeReferrals(referrals: Referral[]) {
  await fs.writeFile(REFERRALS_FILE, JSON.stringify(referrals, null, 2));
}

export async function getReferralByCode(code: string): Promise<Referral | null> {
  const referrals = await readReferrals();
  return referrals.find((r) => r.code === normalizeCode(code)) ?? null;
}

export async function getReferralByEmail(email: string): Promise<Referral | null> {
  const normalized = email.trim().toLowerCase();
  const referrals = await readReferrals();
  return referrals.find((r) => r.referrerEmail.toLowerCase() === normalized) ?? null;
}

export async function createOrGetReferral(
  name: string,
  email: string
): Promise<Referral> {
  const referrals = await readReferrals();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = referrals.find(
    (r) => r.referrerEmail.toLowerCase() === normalizedEmail
  );

  if (existing) {
    if (name.trim() && existing.referrerName !== name.trim()) {
      existing.referrerName = name.trim();
      await writeReferrals(referrals);
    }
    return existing;
  }

  let code = buildReferralCode(name);
  while (referrals.some((r) => r.code === code)) {
    code = buildReferralCode(name);
  }

  const referral: Referral = {
    code,
    referrerName: name.trim(),
    referrerEmail: normalizedEmail,
    clicks: 0,
    conversions: 0,
    pointsClaimed: 0,
    commissionEarned: 0,
    createdAt: new Date().toISOString(),
  };

  referrals.push(referral);
  await writeReferrals(referrals);
  return referral;
}

export async function recordReferralClick(code: string): Promise<Referral | null> {
  const referrals = await readReferrals();
  const normalized = normalizeCode(code);
  const index = referrals.findIndex((r) => r.code === normalized);

  if (index === -1) return null;

  referrals[index].clicks += 1;
  await writeReferrals(referrals);
  return referrals[index];
}

export async function calculateReferralDiscount(
  subtotal: number,
  isFirstOrder: boolean
): Promise<{ valid: boolean; discount: number; error?: string }> {
  const settings = await getSettings();

  if (settings.promoFirstOrderOnly && !isFirstOrder) {
    return { valid: false, discount: 0, error: 'This promo code is for first orders only' };
  }

  const minOrder = Math.max(settings.promoMinOrder, MIN_ORDER_AMOUNT);
  if (subtotal < minOrder) {
    return {
      valid: false,
      discount: 0,
      error: `Minimum order of $${minOrder} required`,
    };
  }

  return {
    valid: true,
    discount: Math.min(settings.promoCustomerDiscount, subtotal),
  };
}

export async function recordReferralConversion(
  code: string,
  orderId: string,
  orderSubtotal: number
): Promise<Referral | null> {
  const referrals = await readReferrals();
  const normalized = normalizeCode(code);
  const index = referrals.findIndex((r) => r.code === normalized);

  if (index === -1) return null;

  const settings = await getSettings();
  const commission = calculateCommissionAmount(orderSubtotal, settings.referrerCommissionPercent);

  referrals[index].conversions += 1;
  referrals[index].commissionEarned = (referrals[index].commissionEarned ?? 0) + commission;
  await writeReferrals(referrals);
  console.log(`Promo conversion: ${normalized} -> order ${orderId} (+$${commission})`);
  return referrals[index];
}

export async function updateReferralCode(
  email: string,
  newCode: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  const normalized = normalizeCode(newCode);
  if (!/^[A-Z0-9-]{4,20}$/.test(normalized)) {
    return { success: false, error: 'Code must be 4–20 characters (letters, numbers, hyphens)' };
  }

  const referrals = await readReferrals();
  const userIndex = referrals.findIndex(
    (r) => r.referrerEmail.toLowerCase() === email.trim().toLowerCase()
  );
  if (userIndex === -1) {
    return { success: false, error: 'Referral record not found' };
  }

  if (referrals.some((r, i) => i !== userIndex && r.code === normalized)) {
    return { success: false, error: 'That promo code is already taken' };
  }

  const { getCoupons } = await import('@/lib/coupons');
  const coupons = await getCoupons();
  if (coupons.some((c) => c.code.toUpperCase() === normalized)) {
    return { success: false, error: 'That code conflicts with a site coupon' };
  }

  referrals[userIndex].code = normalized;
  await writeReferrals(referrals);
  return { success: true, code: normalized };
}

export async function claimReferralPoints(email: string): Promise<{
  pointsToAdd: number;
  referral: Referral | null;
}> {
  const referrals = await readReferrals();
  const normalized = email.trim().toLowerCase();
  const index = referrals.findIndex((r) => r.referrerEmail.toLowerCase() === normalized);

  if (index === -1) {
    return { pointsToAdd: 0, referral: null };
  }

  const referral = referrals[index];
  const settings = await getSettings();
  const earned = referral.conversions * settings.referrerRewardPoints;
  const pointsToAdd = Math.max(0, earned - referral.pointsClaimed);

  if (pointsToAdd > 0) {
    referrals[index].pointsClaimed = earned;
    await writeReferrals(referrals);
  }

  return { pointsToAdd, referral: referrals[index] };
}