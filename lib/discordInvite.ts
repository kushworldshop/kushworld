/** Canonical KushWorld LLC Discord invite — keep in sync with server invite settings. */
export const DISCORD_INVITE_CODE = 'TsDbxrZVwg';

export const DISCORD_INVITE_URL = `https://discord.gg/${DISCORD_INVITE_CODE}`;

/** Always returns the single canonical invite — stored/admin URLs are not used for Discord. */
export function normalizeDiscordInviteUrl(_url?: string | null): string {
  return DISCORD_INVITE_URL;
}