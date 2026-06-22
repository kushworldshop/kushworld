import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/adminAuth';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
} from '@/lib/adminSession';
import { getClientIp } from '@/lib/rateLimit';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = String(body.password || '');
    const captcha = await verifyTurnstileToken(body.turnstileToken, getClientIp(request));
    if (!captcha.ok) {
      return NextResponse.json({ success: false, error: captcha.error }, { status: 400 });
    }

    if (!isAdminAuthorized(password)) {
      return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), getAdminSessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}