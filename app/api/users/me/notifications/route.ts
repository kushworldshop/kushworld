import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import {
  getReferralNotificationsForEmail,
  getUnreadReferralNotificationCount,
  markReferralNotificationsRead,
} from '@/lib/referralNotifications';
import { getUserById } from '@/lib/users';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getReferralNotificationsForEmail(user.email),
    getUnreadReferralNotificationCount(user.email),
  ]);

  return NextResponse.json({ success: true, notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id: unknown) => typeof id === 'string')
      : undefined;
    const markAll = body.all === true;

    const updated = await markReferralNotificationsRead(
      user.email,
      markAll ? undefined : ids
    );

    const unreadCount = await getUnreadReferralNotificationCount(user.email);
    return NextResponse.json({ success: true, updated, unreadCount });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update notifications' }, { status: 500 });
  }
}