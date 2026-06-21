import { NextRequest, NextResponse } from 'next/server';
import {
  createSessionToken,
  getSessionCookieName,
  sessionCookieOptions,
} from '@/lib/auth';
import {
  completeDiscordLink,
  completeDiscordLogin,
  verifyDiscordOAuthState,
} from '@/lib/discordOAuth';
import { claimReferralPoints } from '@/lib/referrals';
import { addLoyaltyPoints } from '@/lib/users';

const STATE_COOKIE = 'kw_discord_oauth_state';

function redirectWithError(request: NextRequest, reason: string) {
  const url = new URL('/account', request.url);
  url.searchParams.set('discord', 'error');
  url.searchParams.set('reason', reason);
  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get('error');
  if (error) {
    return redirectWithError(request, error);
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const savedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirectWithError(request, 'invalid_state');
  }

  const parsedState = verifyDiscordOAuthState(state);
  if (!parsedState) {
    return redirectWithError(request, 'expired_state');
  }

  try {
    if (parsedState.mode === 'link') {
      if (!parsedState.linkUserId) {
        return redirectWithError(request, 'invalid_link');
      }

      await completeDiscordLink(code, parsedState.linkUserId);

      const returnUrl = new URL(parsedState.returnTo, request.url);
      returnUrl.searchParams.set('discord', 'linked');

      const response = NextResponse.redirect(returnUrl);
      response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
      return response;
    }

    const result = await completeDiscordLogin(code);
    const { syncUserDiscordVerificationByUserId } = await import('@/lib/discordGuildSync');
    await syncUserDiscordVerificationByUserId(result.user.id).catch(() => null);
    const { pointsToAdd } = await claimReferralPoints(result.user.email);
    if (pointsToAdd > 0) {
      await addLoyaltyPoints(result.user.id, pointsToAdd);
    }

    const returnUrl = new URL(parsedState.returnTo, request.url);
    returnUrl.searchParams.set('discord', result.isNew ? 'welcome' : 'success');

    const response = NextResponse.redirect(returnUrl);
    response.cookies.set(getSessionCookieName(), createSessionToken(result.user.id), sessionCookieOptions());
    response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    const reason =
      err instanceof Error
        ? encodeURIComponent(err.message.slice(0, 120))
        : 'login_failed';
    const url = new URL('/account', request.url);
    url.searchParams.set('discord', 'error');
    url.searchParams.set('reason', reason);
    const response = NextResponse.redirect(url);
    response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  }
}