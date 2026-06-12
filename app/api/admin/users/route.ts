import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
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
}

function toAdminSummary(user: Awaited<ReturnType<typeof readUsers>>[number]): AdminUserSummary {
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
  };
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const search = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
  const users = await readUsers();
  const filtered = users
    .filter((user) => {
      if (!search) return true;
      return (
        user.email.toLowerCase().includes(search) ||
        user.name.toLowerCase().includes(search) ||
        (user.phone || '').includes(search)
      );
    })
    .map(toAdminSummary)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ success: true, users: filtered, total: filtered.length });
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

    await writeUsers(users);
    return NextResponse.json({ success: true, user: toAdminSummary(users[index]) });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}