import crypto from 'crypto';
import { getAdminPassword, getSessionSecret } from '@/lib/security/secrets';
import { allStaffPermissions, type StaffPermission, type StaffRole } from '@/lib/adminPermissions';

export const ADMIN_SESSION_COOKIE = 'kw_admin_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export interface AdminSession {
  role: StaffRole;
  staffId: string;
  name: string;
  permissions: StaffPermission[];
}

export function ownerSession(): AdminSession {
  return {
    role: 'owner',
    staffId: 'owner',
    name: 'Owner',
    permissions: allStaffPermissions(),
  };
}

function encodePayload(payload: object): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function sign(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function signaturesMatch(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function createAdminSessionToken(session: AdminSession): string {
  const exp = Date.now() + SESSION_MS;
  const body = encodePayload({
    exp,
    role: session.role,
    staffId: session.staffId,
    name: session.name,
  });
  const sig = sign(body, getSessionSecret());
  return `v2.${body}.${sig}`;
}

function parseV2Token(token: string): { staffId: string; role: StaffRole; name: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v2') return null;
  const [, body, sig] = parts;
  if (!body || !sig) return null;
  if (!signaturesMatch(sig, sign(body, getSessionSecret()))) return null;
  const payload = decodePayload(body);
  if (!payload) return null;
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  const role = payload.role;
  const staffId = payload.staffId;
  const name = payload.name;
  if ((role !== 'owner' && role !== 'admin' && role !== 'mod') || typeof staffId !== 'string') {
    return null;
  }
  return {
    staffId,
    role,
    name: typeof name === 'string' && name.trim() ? name : role === 'owner' ? 'Owner' : 'Staff',
  };
}

function parseLegacyOwnerToken(token: string): boolean {
  const [payload, sig] = token.split('.');
  if (!payload || !sig || token.startsWith('v2.')) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = sign(payload, getAdminPassword());
  return signaturesMatch(sig, expected);
}

export function readAdminSessionToken(token: string | undefined | null): {
  staffId: string;
  role: StaffRole;
  name: string;
} | null {
  if (!token) return null;
  const v2 = parseV2Token(token);
  if (v2) return v2;
  if (parseLegacyOwnerToken(token)) {
    return { staffId: 'owner', role: 'owner', name: 'Owner' };
  }
  return null;
}

/** @deprecated Use readAdminSessionToken */
export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  return readAdminSessionToken(token) !== null;
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
