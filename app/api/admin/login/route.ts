import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isAdminAuthorized } from '@/lib/adminAuth';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  ownerSession,
} from '@/lib/adminSession';
import {
  getStaffByUserId,
  getStaffByUsername,
  staffPermissions,
  verifyStaffPasscode,
  type AdminStaffRecord,
} from '@/lib/adminStaff';
import { getUserByEmail, getUserById, isUserBlocked } from '@/lib/users';

async function resolveStaffForLogin(username: string): Promise<AdminStaffRecord | undefined> {
  const byUsername = getStaffByUsername(username);
  if (byUsername) return byUsername;
  if (!username.includes('@')) return undefined;
  const user = await getUserByEmail(username);
  if (!user) return undefined;
  return getStaffByUserId(user.id);
}

async function verifyLinkedMemberPassword(staff: AdminStaffRecord, password: string): Promise<boolean> {
  if (!staff.userId || !password) return false;
  const user = await getUserById(staff.userId);
  if (!user || isUserBlocked(user) || !user.password) return false;
  try {
    return await bcrypt.compare(password, user.password);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = String(body.password || '');
    const username = String(body.username || '').trim().toLowerCase();

    if (!username && isAdminAuthorized(password)) {
      const response = NextResponse.json({ success: true, role: 'owner', name: 'Owner' });
      response.cookies.set(
        ADMIN_SESSION_COOKIE,
        createAdminSessionToken(ownerSession()),
        getAdminSessionCookieOptions()
      );
      return response;
    }

    if (username) {
      const staff = await resolveStaffForLogin(username);
      if (staff?.enabled) {
        const linkedUser = staff.userId ? await getUserById(staff.userId) : null;
        const blocked = linkedUser ? isUserBlocked(linkedUser) : false;
        const passcodeOk = !blocked && verifyStaffPasscode(staff, password);
        const memberOk = !blocked && (await verifyLinkedMemberPassword(staff, password));
        if (passcodeOk || memberOk) {
          const session = {
            role: staff.role,
            staffId: staff.id,
            name: staff.name,
            permissions: staffPermissions(staff),
          };
          const response = NextResponse.json({
            success: true,
            role: staff.role,
            name: staff.name,
            permissions: session.permissions,
          });
          response.cookies.set(
            ADMIN_SESSION_COOKIE,
            createAdminSessionToken(session),
            getAdminSessionCookieOptions()
          );
          return response;
        }
      }
    }

    return NextResponse.json({ success: false, error: 'Incorrect name, email, or passcode' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
