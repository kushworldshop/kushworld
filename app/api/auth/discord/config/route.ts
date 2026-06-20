import { NextResponse } from 'next/server';
import { getDiscordOAuthConfig } from '@/lib/discordOAuth';

export async function GET() {
  const config = getDiscordOAuthConfig();
  return NextResponse.json({
    enabled: config.isConfigured,
    redirectUri: config.isConfigured ? config.redirectUri : null,
  });
}