import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getUserById, isUserBlocked } from '@/lib/users';
import { getSessionSecret } from '@/lib/security/secrets';

const SESSION_COOKIE = 'kushworld_session';
const SESSION_DAYS = 30;

function getSecret(): string {
  return getSessionSecret();
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createSessionToken(userId: string): string {
  const data = {
    userId,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): { userId: string } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.userId || data.exp < Date.now()) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  const user = await getUserById(session.userId);
  if (!user || isUserBlocked(user)) return null;

  return session.userId;
}