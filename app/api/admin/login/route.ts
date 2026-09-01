import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/adminAuth';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  ownerSession,
} from '@/lib/adminSession';
import { getStaffByUsername, staffPermissions, verifyStaffPasscode } from '@/lib/adminStaff';

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
      const staff = getStaffByUsername(username);
      if (staff && verifyStaffPasscode(staff, password)) {
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

    return NextResponse.json({ success: false, error: 'Incorrect name or passcode' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
