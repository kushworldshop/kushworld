import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  createSessionToken,
  getSessionCookieName,
  sessionCookieOptions,
} from '@/lib/auth';
import { claimReferralPoints } from '@/lib/referrals';
import { addLoyaltyPoints, getUserByEmail, getUserDashboard } from '@/lib/users';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const user = await getUserByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const { pointsToAdd } = await claimReferralPoints(user.email);
    if (pointsToAdd > 0) {
      await addLoyaltyPoints(user.id, pointsToAdd);
    }

    const profile = await getUserDashboard(user.id);
    const response = NextResponse.json({ success: true, user: profile });

    response.cookies.set(getSessionCookieName(), createSessionToken(user.id), sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}