import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  createSessionToken,
  getSessionCookieName,
  sessionCookieOptions,
} from '@/lib/auth';
import { createUser, getUserDashboard } from '@/lib/users';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({ email, password: hashedPassword, name });
    const profile = await getUserDashboard(user.id);

    const response = NextResponse.json({
      success: true,
      message: 'Account created',
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