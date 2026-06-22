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
import { getClientIp } from '@/lib/rateLimit';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, promoCode, turnstileToken } = await request.json();
    const captcha = await verifyTurnstileToken(turnstileToken, getClientIp(request));
    if (!captcha.ok) {
      return NextResponse.json({ success: false, error: captcha.error }, { status: 400 });
    }

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
      const codeResult = await updateReferralCode(user.email, promoCode.trim(), user.name, {
        changedBy: 'customer',
      });
      if (!codeResult.success) {
        return NextResponse.json({ success: false, error: codeResult.error }, { status: 400 });
      }
      await updateUser(user.id, { referralCode: codeResult.code });
    }

    const channel = resolveSignupVerificationChannel(user);
    const verificationResult =
      channel === 'phone'
        ? await sendPhoneVerificationCode(user.id)
        : await sendEmailVerificationCode(user.id);

    const profile = await getUserDashboard(user.id);

    const destination = channel === 'phone' ? user.phone : user.email;
    let message = verificationResult.success
      ? `Account created! We sent a 6-digit code to ${destination}. Enter it below to unlock $10 in loyalty points.`
      : `Account created, but we could not send your verification code. ${verificationResult.error || 'Use Send Code to try again.'}`;

    if (verificationResult.devCode) {
      message = `Account created! Dev mode code: ${verificationResult.devCode}`;
    }

    const response = NextResponse.json({
      success: true,
      message,
      verification: {
        channel,
        sent: verificationResult.success,
        stub: verificationResult.stub,
        devCode: verificationResult.devCode,
        error: verificationResult.error,
      },
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