import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  createSessionToken,
  getSessionCookieName,
  sessionCookieOptions,
} from '@/lib/auth';
import {
  sendEmailVerificationCode,
  sendPhoneVerificationCode,
} from '@/lib/accountVerification';
import { resolveSignupVerificationChannel } from '@/lib/signupBonus';
import { updateReferralCode } from '@/lib/referrals';
import { createUser, getUserDashboard, updateUser } from '@/lib/users';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, promoCode } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({
      email,
      password: hashedPassword,
      name,
      phone: typeof phone === 'string' ? phone : undefined,
    });

    if (typeof promoCode === 'string' && promoCode.trim()) {
      const codeResult = await updateReferralCode(user.email, promoCode.trim(), user.name);
      if (!codeResult.success) {
        return NextResponse.json({ success: false, error: codeResult.error }, { status: 400 });
      }
      await updateUser(user.id, { referralCode: codeResult.code });
    }

    const channel = resolveSignupVerificationChannel(user);
    if (channel === 'phone') {
      await sendPhoneVerificationCode(user.id);
    } else {
      await sendEmailVerificationCode(user.id);
    }

    const profile = await getUserDashboard(user.id);

    const response = NextResponse.json({
      success: true,
      message:
        channel === 'phone'
          ? 'Account created — verify your phone to unlock $10 in loyalty points.'
          : 'Account created — verify your email to unlock $10 in loyalty points.',
      user: profile,
    });

    response.cookies.set(getSessionCookieName(), createSessionToken(user.id), sessionCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    const status = message === 'User already exists' ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}