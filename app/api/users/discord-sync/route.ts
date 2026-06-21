import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { syncUserDiscordVerificationByUserId } from '@/lib/discordGuildSync';
import { getUserDashboard } from '@/lib/users';

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
  }

  try {
    const result = await syncUserDiscordVerificationByUserId(userId);
    const dashboard = await getUserDashboard(userId);

    return NextResponse.json({
      success: result.ok,
      reason: result.reason,
      message: result.message,
      user: dashboard,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discord sync failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}