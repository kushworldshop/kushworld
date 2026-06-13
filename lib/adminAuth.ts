import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE } from '@/lib/adminSession';
import { getAdminPassword } from '@/lib/security/secrets';

export function getAdminPasswordValue(): string {
  return getAdminPassword();
}

/** @deprecated Use getAdminPasswordValue — kept for adminSession import compatibility */
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kushworld2026';

export function isAdminAuthorized(password: string | null | undefined): boolean {
  if (!password) return false;
  const expected = getAdminPassword();
  const provided = Buffer.from(password);
  const target = Buffer.from(expected);
  if (provided.length !== target.length) return false;
  return timingSafeEqual(provided, target);
}

export function isAdminRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    const password = request.headers.get('x-admin-password');
    if (isAdminAuthorized(password)) return true;
  }
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}