import type { UserProfile } from '@/lib/users';

export const KUSH_WORLD_TD_HASHTAG = 'KushWorldTD';

export function normalizeXHandle(value: string | undefined | null): string {
  if (!value) return '';
  let input = value.trim();
  input = input.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '');
  input = input.replace(/^@/, '');
  input = input.split(/[/?#]/)[0] || '';
  return input.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

export function profileXHandle(user: Pick<UserProfile, 'socials'>): string {
  return normalizeXHandle(user.socials?.twitter);
}

export function findMembersByXHandle(users: UserProfile[], handle: string): UserProfile[] {
  const key = normalizeXHandle(handle);
  if (!key) return [];
  return users.filter((user) => profileXHandle(user) === key);
}

export function postHasKushWorldTdHashtag(text: string | undefined | null): boolean {
  if (!text) return false;
  return /(?:^|[^a-z0-9_])#kushworldtd(?:[^a-z0-9_]|$)/i.test(text);
}

export function xPostUrl(username: string | undefined, postId: string): string {
  const handle = normalizeXHandle(username);
  if (handle) return `https://x.com/${handle}/status/${postId}`;
  return `https://x.com/i/web/status/${postId}`;
}
