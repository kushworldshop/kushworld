import { NextRequest, NextResponse } from 'next/server';
import {
  isSiteIdVerified,
  syncUserDiscordVerification,
} from '@/lib/discordGuildSync';
import { getUserByDiscordId } from '@/lib/users';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.DISCORD_INTERNAL_SYNC_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization')?.trim();
  return auth === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { discordId?: string };
    const discordId = body.discordId?.trim();
    if (!discordId) {
      return NextResponse.json({ success: false, error: 'discordId required' }, { status: 400 });
    }

    const user = await getUserByDiscordId(discordId);
    if (!user) {
      return NextResponse.json({
        success: false,
        reason: 'no_site_account',
        message: 'Discord not linked to a KushWorld site profile',
      });
    }

    if (!isSiteIdVerified(user)) {
      return NextResponse.json({
        success: false,
        reason: 'not_id_verified',
        message: 'Site ID not verified yet',
      });
    }

    const result = await syncUserDiscordVerification(user);
    return NextResponse.json({
      success: result.ok,
      reason: result.reason,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}