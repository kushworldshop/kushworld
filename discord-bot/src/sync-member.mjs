export async function requestSiteMemberSync(discordUserId) {
  const secret = process.env.DISCORD_INTERNAL_SYNC_SECRET?.trim();
  if (!secret) return null;

  const siteUrl = (process.env.SITE_URL || 'https://kushworld.shop').replace(/\/$/, '');
  const response = await fetch(`${siteUrl}/api/discord/sync-member`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ discordId: discordUserId }),
  }).catch(() => null);

  if (!response?.ok) return null;
  return response.json().catch(() => null);
}