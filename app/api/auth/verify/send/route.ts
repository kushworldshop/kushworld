import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import {
  sendEmailVerificationCode,
  sendPhoneVerificationCode,
  switchSignupVerificationToEmail,
} from '@/lib/accountVerification';

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.action === 'use-email') {
      const switched = await switchSignupVerificationToEmail(userId);
      if (!switched.success) {
        return NextResponse.json({ success: false, error: switched.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: 'Switched to email verification. Request a code below.',
        channel: 'email',
      });
    }

    const { channel } = body;

    if (channel !== 'email' && channel !== 'phone') {
      return NextResponse.json(
        { success: false, error: 'Channel must be "email" or "phone"' },
        { status: 400 }
      );
    }

    const result =
      channel === 'email'
        ? await sendEmailVerificationCode(userId)
        : await sendPhoneVerificationCode(userId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.devCode
        ? `Dev mode verification code: ${result.devCode}`
        : `Verification code sent to your ${channel}`,
      stub: result.stub,
      devCode: result.devCode,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to send code' }, { status: 500 });
  }
}