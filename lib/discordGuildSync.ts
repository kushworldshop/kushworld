import { getUserById, readUsers, writeUsers, type UserProfile } from '@/lib/users';

const DISCORD_API = 'https://discord.com/api/v10';
const VERIFIED_ROLE_NAME = 'Verified';

export type DiscordSyncReason =
  | 'synced'
  | 'not_configured'
  | 'no_discord_linked'
  | 'not_id_verified'
  | 'not_in_guild'
  | 'role_not_found'
  | 'grant_failed'
  | 'revoke_failed'
  | 'member_lookup_failed';

export interface DiscordSyncResult {
  ok: boolean;
  reason: DiscordSyncReason;
  message?: string;
}

export function isDiscordGuildSyncConfigured(): boolean {
  return Boolean(
    process.env.DISCORD_BOT_TOKEN?.trim() && process.env.DISCORD_GUILD_ID?.trim()
  );
}

export function isSiteIdVerified(
  user: Pick<UserProfile, 'idVerified' | 'idVerification'>
): boolean {
  return !!(user.idVerified || user.idVerification?.status === 'verified');
}

function botToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) throw new Error('DISCORD_BOT_TOKEN not configured');
  return token;
}

function guildId(): string {
  const id = process.env.DISCORD_GUILD_ID?.trim();
  if (!id) throw new Error('DISCORD_GUILD_ID not configured');
  return id;
}

async function discordBotFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken()}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

let cachedVerifiedRoleId: string | null | undefined;

async function getVerifiedRoleId(): Promise<string | null> {
  const envRoleId = process.env.DISCORD_VERIFIED_ROLE_ID?.trim();
  if (envRoleId) return envRoleId;

  if (cachedVerifiedRoleId !== undefined) return cachedVerifiedRoleId;

  const response = await discordBotFetch(`/guilds/${guildId()}/roles`);
  if (!response.ok) {
    cachedVerifiedRoleId = null;
    return null;
  }

  const roles = (await response.json()) as Array<{ id: string; name: string }>;
  cachedVerifiedRoleId = roles.find((role) => role.name === VERIFIED_ROLE_NAME)?.id ?? null;
  return cachedVerifiedRoleId;
}

async function isGuildMember(discordUserId: string): Promise<boolean> {
  const response = await discordBotFetch(`/guilds/${guildId()}/members/${discordUserId}`);
  return response.ok;
}

export async function grantDiscordVerifiedRole(discordUserId: string): Promise<DiscordSyncResult> {
  if (!isDiscordGuildSyncConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }

  const roleId = await getVerifiedRoleId();
  if (!roleId) {
    return { ok: false, reason: 'role_not_found', message: 'Verified role not found in Discord' };
  }

  if (!(await isGuildMember(discordUserId))) {
    return {
      ok: false,
      reason: 'not_in_guild',
      message: 'Join the KushWorld LLC Discord server first, then sync again from your account.',
    };
  }

  const response = await discordBotFetch(
    `/guilds/${guildId()}/members/${discordUserId}/roles/${roleId}`,
    { method: 'PUT' }
  );

  if (response.status === 204 || response.ok) {
    return { ok: true, reason: 'synced' };
  }

  const detail = await response.text().catch(() => '');
  return {
    ok: false,
    reason: 'grant_failed',
    message: detail.slice(0, 200) || 'Could not assign Verified role',
  };
}

export async function revokeDiscordVerifiedRole(discordUserId: string): Promise<DiscordSyncResult> {
  if (!isDiscordGuildSyncConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }

  const roleId = await getVerifiedRoleId();
  if (!roleId) {
    return { ok: false, reason: 'role_not_found' };
  }

  if (!(await isGuildMember(discordUserId))) {
    return { ok: true, reason: 'synced' };
  }

  const response = await discordBotFetch(
    `/guilds/${guildId()}/members/${discordUserId}/roles/${roleId}`,
    { method: 'DELETE' }
  );

  if (response.status === 204 || response.ok) {
    return { ok: true, reason: 'synced' };
  }

  return { ok: false, reason: 'revoke_failed' };
}

async function persistDiscordSyncState(
  userId: string,
  patch: Pick<UserProfile, 'discordVerifiedAt' | 'discordVerifySyncPending'>
): Promise<void> {
  const users = await readUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return;

  users[index] = {
    ...users[index],
    discordVerifiedAt: patch.discordVerifiedAt,
    discordVerifySyncPending: patch.discordVerifySyncPending,
  };
  await writeUsers(users);
}

export async function syncUserDiscordVerification(user: UserProfile): Promise<DiscordSyncResult> {
  if (!user.discordId) {
    await persistDiscordSyncState(user.id, {
      discordVerifiedAt: undefined,
      discordVerifySyncPending: false,
    });
    return { ok: false, reason: 'no_discord_linked' };
  }

  if (!isSiteIdVerified(user)) {
    const revoked = await revokeDiscordVerifiedRole(user.discordId);
    if (revoked.ok) {
      await persistDiscordSyncState(user.id, {
        discordVerifiedAt: undefined,
        discordVerifySyncPending: false,
      });
    }
    return { ok: false, reason: 'not_id_verified' };
  }

  const granted = await grantDiscordVerifiedRole(user.discordId);
  if (granted.ok) {
    await persistDiscordSyncState(user.id, {
      discordVerifiedAt: new Date().toISOString(),
      discordVerifySyncPending: false,
    });
    return granted;
  }

  await persistDiscordSyncState(user.id, {
    discordVerifiedAt: user.discordVerifiedAt,
    discordVerifySyncPending: granted.reason === 'not_in_guild',
  });
  return granted;
}

export async function syncUserDiscordVerificationByUserId(userId: string): Promise<DiscordSyncResult> {
  const user = await getUserById(userId);
  if (!user) {
    return { ok: false, reason: 'grant_failed', message: 'User not found' };
  }
  return syncUserDiscordVerification(user);
}