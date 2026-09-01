import { timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ownerSession,
  readAdminSessionToken,
  type AdminSession,
} from '@/lib/adminSession';
import { getAdminPassword } from '@/lib/security/secrets';
import { permissionForRequest, type StaffPermission } from '@/lib/adminPermissions';
import { getStaffById, staffPermissions } from '@/lib/adminStaff';

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

export function getAdminSession(request: NextRequest): AdminSession | null {
  if (process.env.NODE_ENV !== 'production') {
    const password = request.headers.get('x-admin-password');
    if (isAdminAuthorized(password)) return ownerSession();
  }

  const parsed = readAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!parsed) return null;

  if (parsed.role === 'owner' && parsed.staffId === 'owner') {
    return ownerSession();
  }

  const staff = getStaffById(parsed.staffId);
  if (!staff || !staff.enabled) return null;

  return {
    role: staff.role,
    staffId: staff.id,
    name: staff.name,
    permissions: staffPermissions(staff),
  };
}

export function sessionHasPermission(session: AdminSession, permission: StaffPermission | 'owner' | 'any'): boolean {
  if (permission === 'any') return true;
  if (permission === 'owner') return session.role === 'owner';
  if (session.role === 'owner' || session.role === 'admin') return true;
  return session.permissions.includes(permission);
}

export function isAdminRequest(request: NextRequest): boolean {
  const session = getAdminSession(request);
  if (!session) return false;
  return sessionHasPermission(session, permissionForRequest(request));
}
