/** Canonical KushWorld LLC Discord invite — keep in sync with server invite settings. */
export const DISCORD_INVITE_CODE = 'TsDbxrZVwg';

export const DISCORD_INVITE_URL = `https://discord.gg/${DISCORD_INVITE_CODE}`;

export function normalizeDiscordInviteUrl(url?: string | null): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return DISCORD_INVITE_URL;
  const match = trimmed.match(/(?:discord\.gg\/|discord\.com\/invite\/)([A-Za-z0-9-]+)/i);
  if (!match) return DISCORD_INVITE_URL;
  return `https://discord.gg/${match[1]}`;
}