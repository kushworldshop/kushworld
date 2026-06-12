import type { NextRequest } from 'next/server';
import { verifyAdminSessionToken, ADMIN_SESSION_COOKIE } from '@/lib/adminSession';

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kushworld2026';

export function isAdminAuthorized(password: string | null | undefined): boolean {
  return password === ADMIN_PASSWORD;
}

export function isAdminRequest(request: NextRequest): boolean {
  const password = request.headers.get('x-admin-password');
  if (isAdminAuthorized(password)) return true;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}