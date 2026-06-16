import { NextRequest, NextResponse } from 'next/server';
import { handlePhoneChange } from '@/lib/accountVerification';
import { getSessionUserId } from '@/lib/auth';
import { updateReferralCode } from '@/lib/referrals';
import { getUserById, getUserDashboard, updateUser } from '@/lib/users';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getUserDashboard(userId);
  if (!profile) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, user: profile });
}

export async function PATCH(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const allowed = ['name', 'phone', 'bio', 'avatarUrl', 'socials', 'shippingAddress', 'secondaryAddress'] as const;
    const updates: Record<string, unknown> = {};

    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (body.promoCode) {
      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      const result = await updateReferralCode(user.email, body.promoCode, user.name, {
        changedBy: 'customer',
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      updates.referralCode = result.code;
    }

    if (typeof body.phone === 'string') {
      await handlePhoneChange(userId, body.phone);
      delete updates.phone;
    }

    const updated = Object.keys(updates).length > 0 ? await updateUser(userId, updates) : await getUserById(userId);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const profile = await getUserDashboard(userId);
    return NextResponse.json({ success: true, user: profile });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}