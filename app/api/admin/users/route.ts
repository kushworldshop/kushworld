import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { readOrders } from '@/lib/ordersStore';
import {
  createOrGetReferral,
  getReferralByEmail,
  getReferralLink,
  resolveReferralCommissionPercent,
  resolveReferralRewardPoints,
  updateReferralCode,
  updateReferralCommissionByEmail,
  updateReferralRewardPointsByEmail,
} from '@/lib/referrals';
import { getSettings } from '@/lib/settings';
import { getRedeemableLoyaltyPoints, readUsers, writeUsers, type UserSocials } from '@/lib/users';

export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
  loyaltyPoints: number;
  lockedLoyaltyPoints: number;
  redeemableLoyaltyPoints: number;
  idVerified?: boolean;
  signupBonusClaimed?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  bio?: string;
  avatarUrl?: string;
  socials?: UserSocials;
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  referralCode?: string;
  promoCode?: string;
  referralLink?: string;
  orderCount: number;
  commissionPercent?: number;
  commissionPercentOverride?: number | null;
  defaultCommissionPercent?: number;
  referrerRewardPoints?: number;
  referrerRewardPointsOverride?: number | null;
  defaultReferrerRewardPoints?: number;
  commissionEarned?: number;
  pointsEarnedFromReferrals?: number;
  pointsClaimedFromReferrals?: number;
  promoConversions?: number;
  promoClicks?: number;
}

function sanitizeSocials(socials: unknown): UserSocials | undefined {
  if (!socials || typeof socials !== 'object') return undefined;
  const input = socials as Record<string, unknown>;
  const cleaned: UserSocials = {};
  for (const key of ['instagram', 'twitter', 'tiktok', 'youtube', 'website'] as const) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) {
      cleaned[key] = value.trim();
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : {};
}

async function countOrdersByEmail(email: string): Promise<number> {
  const orders = await readOrders<{ email?: string; customer?: { email?: string } }>();
  const normalized = email.toLowerCase();
  return orders.filter((order) => {
    const orderEmail = (order.customer?.email || order.email || '').toLowerCase();
    return orderEmail === normalized;
  }).length;
}

async function toAdminSummary(
  user: Awaited<ReturnType<typeof readUsers>>[number]
): Promise<AdminUserSummary> {
  const settings = await getSettings();
  const referral = await getReferralByEmail(user.email);
  const effectiveCommission = referral
    ? resolveReferralCommissionPercent(referral, settings.referrerCommissionPercent)
    : settings.referrerCommissionPercent;
  const effectiveRewardPoints = referral
    ? resolveReferralRewardPoints(referral, settings.referrerRewardPoints)
    : settings.referrerRewardPoints;
  const promoCode = referral?.code ?? user.referralCode;
  const pointsEarnedFromReferrals = referral ? referral.conversions * effectiveRewardPoints : 0;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    createdAt: user.createdAt,
    loyaltyPoints: user.loyaltyPoints ?? 0,
    lockedLoyaltyPoints: user.lockedLoyaltyPoints ?? 0,
    redeemableLoyaltyPoints: getRedeemableLoyaltyPoints(user),
    idVerified: user.idVerified,
    signupBonusClaimed: user.signupBonusClaimed,
    emailVerified: !!user.emailVerifiedAt,
    phoneVerified: !!user.phoneVerifiedAt,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    socials: user.socials ?? {},
    shippingAddress: user.shippingAddress,
    referralCode: user.referralCode,
    promoCode,
    referralLink: promoCode ? getReferralLink(promoCode) : undefined,
    orderCount: await countOrdersByEmail(user.email),
    commissionPercent: effectiveCommission,
    commissionPercentOverride:
      referral?.commissionPercent !== undefined && referral?.commissionPercent !== null
        ? referral.commissionPercent
        : null,
    defaultCommissionPercent: settings.referrerCommissionPercent,
    referrerRewardPoints: effectiveRewardPoints,
    referrerRewardPointsOverride:
      referral?.rewardPointsOverride !== undefined && referral?.rewardPointsOverride !== null
        ? referral.rewardPointsOverride
        : null,
    defaultReferrerRewardPoints: settings.referrerRewardPoints,
    commissionEarned: referral?.commissionEarned ?? 0,
    pointsEarnedFromReferrals,
    pointsClaimedFromReferrals: referral?.pointsClaimed ?? 0,
    promoConversions: referral?.conversions ?? 0,
    promoClicks: referral?.clicks ?? 0,
  };
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
  const users = await readUsers();
  const filtered = users.filter((user) => {
    if (!search) return true;
    const socialText = Object.values(user.socials ?? {}).join(' ').toLowerCase();
    return (
      user.email.toLowerCase().includes(search) ||
      user.name.toLowerCase().includes(search) ||
      (user.phone || '').includes(search) ||
      (user.referralCode || '').toLowerCase().includes(search) ||
      socialText.includes(search)
    );
  });

  const summaries = await Promise.all(filtered.map(toAdminSummary));
  summaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ success: true, users: summaries, total: summaries.length });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const userId = String(body.id || '').trim();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User id required' }, { status: 400 });
    }

    const users = await readUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index === -1) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const current = users[index];
    users[index] = {
      ...current,
      name: body.name !== undefined ? String(body.name).trim() || current.name : current.name,
      phone: body.phone !== undefined ? String(body.phone).trim() || undefined : current.phone,
      bio: body.bio !== undefined ? String(body.bio) : current.bio,
      avatarUrl: body.avatarUrl !== undefined ? String(body.avatarUrl) || undefined : current.avatarUrl,
      socials: body.socials !== undefined ? sanitizeSocials(body.socials) : current.socials,
      loyaltyPoints:
        body.loyaltyPoints !== undefined ? Math.max(0, Math.floor(Number(body.loyaltyPoints))) : current.loyaltyPoints,
      lockedLoyaltyPoints:
        body.lockedLoyaltyPoints !== undefined
          ? Math.max(0, Math.floor(Number(body.lockedLoyaltyPoints)))
          : current.lockedLoyaltyPoints,
      idVerified: body.idVerified !== undefined ? Boolean(body.idVerified) : current.idVerified,
      signupBonusClaimed:
        body.signupBonusClaimed !== undefined ? Boolean(body.signupBonusClaimed) : current.signupBonusClaimed,
    };

    if (body.commissionPercent !== undefined) {
      const useDefault = body.commissionPercent === '' || body.commissionPercent === null;
      const commissionResult = await updateReferralCommissionByEmail(
        users[index].email,
        useDefault ? null : Number(body.commissionPercent)
      );
      if (!commissionResult.success) {
        return NextResponse.json(
          { success: false, error: commissionResult.error || 'Failed to update commission' },
          { status: 400 }
        );
      }
    }

    if (body.referrerRewardPoints !== undefined) {
      const useDefault = body.referrerRewardPoints === '' || body.referrerRewardPoints === null;
      const rewardResult = await updateReferralRewardPointsByEmail(
        users[index].email,
        useDefault ? null : Number(body.referrerRewardPoints)
      );
      if (!rewardResult.success) {
        return NextResponse.json(
          { success: false, error: rewardResult.error || 'Failed to update referral reward points' },
          { status: 400 }
        );
      }
    }

    if (body.promoCode !== undefined) {
      const trimmed = String(body.promoCode).trim();
      if (!trimmed) {
        return NextResponse.json({ success: false, error: 'Promo code cannot be empty' }, { status: 400 });
      }

      await createOrGetReferral(users[index].name, users[index].email);
      const codeResult = await updateReferralCode(users[index].email, trimmed, users[index].name);
      if (!codeResult.success) {
        return NextResponse.json(
          { success: false, error: codeResult.error || 'Failed to update promo code' },
          { status: 400 }
        );
      }
      users[index].referralCode = codeResult.code;
    }

    await writeUsers(users);
    const user = await toAdminSummary(users[index]);
    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}