import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { confirmEmailCode, confirmPhoneCode } from '@/lib/accountVerification';
import { getUserDashboard } from '@/lib/users';

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { channel, code } = await request.json();

    if (channel !== 'email' && channel !== 'phone') {
      return NextResponse.json(
        { success: false, error: 'Channel must be "email" or "phone"' },
        { status: 400 }
      );
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Verification code required' }, { status: 400 });
    }

    const result =
      channel === 'email'
        ? await confirmEmailCode(userId, code)
        : await confirmPhoneCode(userId, code);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const profile = await getUserDashboard(userId);

    return NextResponse.json({
      success: true,
      message:
        result.bonusClaimed
          ? `Verified! You earned ${result.pointsAwarded?.toLocaleString()} loyalty points ($10). Complete your first purchase to unlock them at checkout.`
          : `${channel === 'email' ? 'Email' : 'Phone'} verified successfully.`,
      bonusClaimed: result.bonusClaimed,
      pointsAwarded: result.pointsAwarded,
      user: profile,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to verify code' }, { status: 500 });
  }
}