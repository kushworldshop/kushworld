import { parseXPostUrl } from '@/lib/socialRewards';
import {
  KUSH_WORLD_TD_HASHTAG,
  normalizeXHandle,
  postHasKushWorldTdHashtag,
  xPostUrl,
} from '@/lib/xHandle';

export interface XTdPost {
  postId: string;
  username: string;
  text: string;
  url: string;
  createdAt?: string;
}

function getXBearerToken(): string {
  return (
    process.env.X_BEARER_TOKEN?.trim() ||
    process.env.TWITTER_BEARER_TOKEN?.trim() ||
    process.env.X_API_BEARER?.trim() ||
    ''
  );
}

export function isXTdScanConfigured(): boolean {
  return Boolean(getXBearerToken());
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function lookupViaApi(postId: string): Promise<XTdPost | null> {
  const token = getXBearerToken();
  if (!token) return null;
  const url = new URL(`https://api.twitter.com/2/tweets/${postId}`);
  url.searchParams.set('tweet.fields', 'text,author_id,created_at,entities');
  url.searchParams.set('expansions', 'author_id');
  url.searchParams.set('user.fields', 'username');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    data?: { id: string; text?: string; created_at?: string; author_id?: string };
    includes?: { users?: Array<{ id: string; username?: string }> };
  };
  const tweet = data.data;
  if (!tweet?.id) return null;
  const user = data.includes?.users?.find((row) => row.id === tweet.author_id);
  const username = normalizeXHandle(user?.username);
  return {
    postId: tweet.id,
    username,
    text: tweet.text || '',
    url: xPostUrl(username, tweet.id),
    createdAt: tweet.created_at,
  };
}

async function lookupViaOembed(postUrl: string): Promise<XTdPost | null> {
  const parsed = parseXPostUrl(postUrl);
  if (!parsed.ok) return null;
  const endpoint = `https://publish.twitter.com/oembed?omit_script=true&url=${encodeURIComponent(parsed.canonicalUrl)}`;
  const res = await fetch(endpoint, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = (await res.json()) as { author_url?: string; html?: string };
  const username = normalizeXHandle(data.author_url || parsed.postAuthor || '');
  const text = stripHtml(data.html || '');
  return {
    postId: parsed.postId,
    username,
    text,
    url: xPostUrl(username, parsed.postId),
  };
}

export async function lookupXTdPost(postUrl: string): Promise<XTdPost | null> {
  const parsed = parseXPostUrl(postUrl);
  if (!parsed.ok) return null;
  const fromApi = await lookupViaApi(parsed.postId);
  if (fromApi) return fromApi;
  return lookupViaOembed(parsed.canonicalUrl);
}

export async function searchKushWorldTdPosts(input?: {
  sinceId?: string;
  maxResults?: number;
}): Promise<{ posts: XTdPost[]; newestId?: string; error?: string }> {
  const token = getXBearerToken();
  if (!token) {
    return {
      posts: [],
      error: 'Set X_BEARER_TOKEN on the server to auto-scan #KushWorldTD posts.',
    };
  }

  const url = new URL('https://api.twitter.com/2/tweets/search/recent');
  url.searchParams.set('query', `#${KUSH_WORLD_TD_HASHTAG} -is:retweet`);
  url.searchParams.set('max_results', String(Math.min(100, Math.max(10, input?.maxResults ?? 50))));
  url.searchParams.set('tweet.fields', 'text,author_id,created_at,entities');
  url.searchParams.set('expansions', 'author_id');
  url.searchParams.set('user.fields', 'username');
  if (input?.sinceId) url.searchParams.set('since_id', input.sinceId);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = (await res.json()) as {
    data?: Array<{ id: string; text?: string; created_at?: string; author_id?: string }>;
    includes?: { users?: Array<{ id: string; username?: string }> };
    meta?: { newest_id?: string };
    errors?: Array<{ message?: string }>;
    title?: string;
    detail?: string;
  };

  if (!res.ok) {
    const message = data.detail || data.title || data.errors?.[0]?.message || `X search failed (${res.status})`;
    return { posts: [], error: message };
  }

  const users = new Map((data.includes?.users || []).map((row) => [row.id, normalizeXHandle(row.username)]));
  const posts: XTdPost[] = [];
  for (const tweet of data.data || []) {
    const username = users.get(tweet.author_id || '') || '';
    const text = tweet.text || '';
    if (!postHasKushWorldTdHashtag(text)) continue;
    posts.push({
      postId: tweet.id,
      username,
      text,
      url: xPostUrl(username, tweet.id),
      createdAt: tweet.created_at,
    });
  }

  return { posts, newestId: data.meta?.newest_id };
}
