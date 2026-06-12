import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getUserDashboard, updateUser } from '@/lib/users';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const profile = await getUserDashboard(userId);
  if (!profile) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, user: profile });
}

export async function PATCH(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const allowed = ['name', 'phone', 'bio', 'avatarUrl', 'socials', 'shippingAddress'] as const;
    const updates: Record<string, unknown> = {};

    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const updated = await updateUser(userId, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const profile = await getUserDashboard(userId);
    return NextResponse.json({ success: true, user: profile });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}