import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import {
  getReferralByEmail,
  resolveReferralCommissionPercent,
  updateReferralCommissionByEmail,
} from '@/lib/referrals';
import { getSettings } from '@/lib/settings';
import { readUsers, writeUsers } from '@/lib/users';

export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
  loyaltyPoints: number;
  lockedLoyaltyPoints: number;
  idVerified?: boolean;
  signupBonusClaimed?: boolean;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  bio?: string;
  avatarUrl?: string;
  referralCode?: string;
  promoCode?: string;
  commissionPercent?: number;
  commissionPercentOverride?: number | null;
  defaultCommissionPercent?: number;
  commissionEarned?: number;
  promoConversions?: number;
  promoClicks?: number;
}

async function toAdminSummary(
  user: Awaited<ReturnType<typeof readUsers>>[number]
): Promise<AdminUserSummary> {
  const settings = await getSettings();
  const referral = await getReferralByEmail(user.email);
  const effectiveCommission = referral
    ? resolveReferralCommissionPercent(referral, settings.referrerCommissionPercent)
    : settings.referrerCommissionPercent;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    createdAt: user.createdAt,
    loyaltyPoints: user.loyaltyPoints ?? 0,
    lockedLoyaltyPoints: user.lockedLoyaltyPoints ?? 0,
    idVerified: user.idVerified,
    signupBonusClaimed: user.signupBonusClaimed,
    emailVerifiedAt: user.emailVerifiedAt,
    phoneVerifiedAt: user.phoneVerifiedAt,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    referralCode: user.referralCode,
    promoCode: referral?.code ?? user.referralCode,
    commissionPercent: effectiveCommission,
    commissionPercentOverride:
      referral?.commissionPercent !== undefined && referral?.commissionPercent !== null
        ? referral.commissionPercent
        : null,
    defaultCommissionPercent: settings.referrerCommissionPercent,
    commissionEarned: referral?.commissionEarned ?? 0,
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
    return (
      user.email.toLowerCase().includes(search) ||
      user.name.toLowerCase().includes(search) ||
      (user.phone || '').includes(search) ||
      (user.referralCode || '').toLowerCase().includes(search)
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

    await writeUsers(users);
    const user = await toAdminSummary(users[index]);
    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}