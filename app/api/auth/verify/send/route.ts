import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import {
  sendEmailVerificationCode,
  sendPhoneVerificationCode,
} from '@/lib/accountVerification';

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { channel } = await request.json();

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
      message: `Verification code sent to your ${channel}`,
      stub: result.stub,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to send code' }, { status: 500 });
  }
}