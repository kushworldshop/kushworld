import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import { getSessionSecret } from '@/lib/security/secrets';
import { createOrGetReferral } from '@/lib/referrals';
import {
  getUserByDiscordId,
  getUserByEmail,
  getUserDashboard,
  isUserBlocked,
  readUsers,
  writeUsers,
  type UserProfile,
} from '@/lib/users';

const DISCORD_AUTHORIZE_URL = 'https://discord.com/api/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/users/@me';
const STATE_MS = 10 * 60 * 1000;

export interface DiscordOAuthConfig {
  isConfigured: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface DiscordUserProfile {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string;
  verified?: boolean;
}

function signState(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

export function getDiscordOAuthConfig(): DiscordOAuthConfig {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim() || '';
  const siteUrl = (process.env.DISCORD_REDIRECT_URI?.trim()
    ? process.env.DISCORD_REDIRECT_URI.replace(/\/api\/auth\/discord\/callback\/?$/, '')
    : process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://kushworld.shop'
  ).replace(/\/$/, '');
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI?.trim() || `${siteUrl}/api/auth/discord/callback`;

  return {
    isConfigured: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    redirectUri,
  };
}

export type DiscordOAuthMode = 'login' | 'link';

export function createDiscordOAuthState(
  returnTo = '/account',
  options?: { mode?: DiscordOAuthMode; linkUserId?: string }
): string {
  const payload = Buffer.from(
    JSON.stringify({
      nonce: randomBytes(16).toString('hex'),
      returnTo: returnTo.startsWith('/') ? returnTo : '/account',
      mode: options?.mode === 'link' ? 'link' : 'login',
      linkUserId: options?.mode === 'link' ? options.linkUserId : undefined,
      exp: Date.now() + STATE_MS,
    })
  ).toString('base64url');
  return `${payload}.${signState(payload)}`;
}

export function verifyDiscordOAuthState(
  token: string
): { returnTo: string; mode: DiscordOAuthMode; linkUserId?: string } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = signState(payload);
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return {
      returnTo: typeof data.returnTo === 'string' ? data.returnTo : '/account',
      mode: data.mode === 'link' ? 'link' : 'login',
      linkUserId: typeof data.linkUserId === 'string' ? data.linkUserId : undefined,
    };
  } catch {
    return null;
  }
}

export function buildDiscordAuthorizeUrl(state: string): string {
  const config = getDiscordOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
    prompt: 'consent',
  });
  return `${DISCORD_AUTHORIZE_URL}?${params.toString()}`;
}

export function discordAvatarUrl(user: DiscordUserProfile): string | undefined {
  if (!user.avatar) return undefined;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
}

async function exchangeDiscordCode(code: string): Promise<string> {
  const config = getDiscordOAuthConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error || 'Discord token exchange failed');
  }
  return data.access_token;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUserProfile> {
  const response = await fetch(DISCORD_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as DiscordUserProfile & { message?: string };
  if (!response.ok || !data.id) {
    throw new Error(data.message || 'Could not load Discord profile');
  }
  return data;
}

async function randomPasswordHash(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString('hex'), 10);
}

export async function resolveUserFromDiscord(
  profile: DiscordUserProfile
): Promise<{ user: UserProfile; isNew: boolean }> {
  const discordId = profile.id;
  const displayName = profile.global_name?.trim() || profile.username?.trim() || 'Discord User';
  const avatarUrl = discordAvatarUrl(profile);

  const existingByDiscord = await getUserByDiscordId(discordId);
  if (existingByDiscord) {
    if (isUserBlocked(existingByDiscord)) {
      throw new Error('This account has been suspended');
    }

    const users = await readUsers();
    const index = users.findIndex((user) => user.id === existingByDiscord.id);
    if (index !== -1) {
      users[index] = {
        ...users[index],
        discordUsername: profile.username,
        name: users[index].name || displayName,
        avatarUrl: users[index].avatarUrl || avatarUrl,
      };
      await writeUsers(users);
      const { syncUserDiscordVerificationByUserId } = await import('@/lib/discordGuildSync');
      await syncUserDiscordVerificationByUserId(users[index].id).catch(() => null);
      return { user: users[index], isNew: false };
    }

    return { user: existingByDiscord, isNew: false };
  }

  const email = profile.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('Discord did not share an email. Allow email access or use email login.');
  }

  const existingByEmail = await getUserByEmail(email);
  if (existingByEmail) {
    if (isUserBlocked(existingByEmail)) {
      throw new Error('This account has been suspended');
    }
    if (!profile.verified) {
      throw new Error('Verify your email on Discord before linking to an existing account');
    }

    const users = await readUsers();
    const index = users.findIndex((user) => user.id === existingByEmail.id);
    if (index === -1) throw new Error('Account not found');

    users[index] = {
      ...users[index],
      discordId,
      discordUsername: profile.username,
      name: users[index].name || displayName,
      avatarUrl: users[index].avatarUrl || avatarUrl,
      emailVerifiedAt: users[index].emailVerifiedAt || new Date().toISOString(),
      authProvider: users[index].password ? 'both' : 'discord',
    };
    await writeUsers(users);
    const { syncUserDiscordVerificationByUserId } = await import('@/lib/discordGuildSync');
    await syncUserDiscordVerificationByUserId(users[index].id).catch(() => null);
    return { user: users[index], isNew: false };
  }

  const users = await readUsers();
  const referral = await createOrGetReferral(displayName, email);
  const newUser: UserProfile = {
    id: `user_${Date.now()}`,
    email,
    name: displayName,
    password: await randomPasswordHash(),
    createdAt: new Date().toISOString(),
    loyaltyPoints: 0,
    referralCode: referral.code,
    socials: {},
    discordId,
    discordUsername: profile.username,
    avatarUrl,
    authProvider: 'discord',
    emailVerifiedAt: profile.verified ? new Date().toISOString() : undefined,
    signupVerificationChannel: 'email',
  };

  users.push(newUser);
  await writeUsers(users);
  const { syncUserDiscordVerificationByUserId } = await import('@/lib/discordGuildSync');
  await syncUserDiscordVerificationByUserId(newUser.id).catch(() => null);
  return { user: newUser, isNew: true };
}

export async function linkDiscordToUser(
  userId: string,
  profile: DiscordUserProfile
): Promise<UserProfile> {
  const discordId = profile.id.trim();
  const existingByDiscord = await getUserByDiscordId(discordId);
  if (existingByDiscord && existingByDiscord.id !== userId) {
    throw new Error('This Discord account is already linked to another profile');
  }

  const users = await readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) throw new Error('Account not found');

  if (isUserBlocked(users[index])) {
    throw new Error('This account has been suspended');
  }

  if (users[index].discordId && users[index].discordId !== discordId) {
    throw new Error('Your profile already has a different Discord account linked');
  }

  const displayName = profile.global_name?.trim() || profile.username?.trim();
  const avatarUrl = discordAvatarUrl(profile);

  users[index] = {
    ...users[index],
    discordId,
    discordUsername: profile.username,
    name: users[index].name || displayName || users[index].name,
    avatarUrl: users[index].avatarUrl || avatarUrl,
    authProvider:
      users[index].authProvider === 'discord'
        ? 'discord'
        : users[index].password
          ? 'both'
          : users[index].authProvider || 'email',
  };

  await writeUsers(users);

  const { syncUserDiscordVerificationByUserId } = await import('@/lib/discordGuildSync');
  await syncUserDiscordVerificationByUserId(users[index].id).catch(() => null);

  return users[index];
}

export async function completeDiscordLink(code: string, userId: string) {
  const accessToken = await exchangeDiscordCode(code);
  const discordUser = await fetchDiscordUser(accessToken);
  const user = await linkDiscordToUser(userId, discordUser);
  const dashboard = await getUserDashboard(user.id);
  return { user, dashboard };
}

export async function completeDiscordLogin(code: string) {
  const accessToken = await exchangeDiscordCode(code);
  const discordUser = await fetchDiscordUser(accessToken);
  const { user, isNew } = await resolveUserFromDiscord(discordUser);
  const dashboard = await getUserDashboard(user.id);
  return { user, dashboard, isNew };
}