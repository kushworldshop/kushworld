import crypto from 'crypto';
import { getAdminPasswordValue } from '@/lib/adminAuth';

export const ADMIN_SESSION_COOKIE = 'kw_admin_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function createAdminSessionToken(): string {
  const exp = Date.now() + SESSION_MS;
  const payload = String(exp);
  const sig = crypto.createHmac('sha256', getAdminPasswordValue()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;

  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const expected = crypto.createHmac('sha256', getAdminPasswordValue()).update(payload).digest('hex');
  if (sig.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MS / 1000,
  };
}