import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import {
  buildDiscordAuthorizeUrl,
  createDiscordOAuthState,
  getDiscordOAuthConfig,
} from '@/lib/discordOAuth';

const STATE_COOKIE = 'kw_discord_oauth_state';

export async function GET(request: NextRequest) {
  const config = getDiscordOAuthConfig();
  if (!config.isConfigured) {
    return NextResponse.redirect(
      new URL('/account?discord=error&reason=not_configured', request.url)
    );
  }

  const mode = request.nextUrl.searchParams.get('mode') === 'link' ? 'link' : 'login';
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/account';

  let linkUserId: string | undefined;
  if (mode === 'link') {
    linkUserId = (await getSessionUserId()) ?? undefined;
    if (!linkUserId) {
      return NextResponse.redirect(
        new URL('/account?discord=error&reason=sign_in_required', request.url)
      );
    }
  }

  const state = createDiscordOAuthState(returnTo, { mode, linkUserId });
  const response = NextResponse.redirect(buildDiscordAuthorizeUrl(state));

  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return response;
}