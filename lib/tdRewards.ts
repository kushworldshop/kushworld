import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { parseXPostUrl } from '@/lib/socialRewards';
import { customerHasAnyPurchase } from '@/lib/purchaseVerification';
import { getSiteContent } from '@/lib/siteContent';
import {
  SPIN_COST,
  getSpinCouponSlot,
  isSpinPrizeActive,
  isTdCoupon,
  type SpinPrize,
} from '@/lib/spinWheelTypes';
import {
  addLoyaltyPoints,
  getRedeemableLoyaltyPoints,
  getUserById,
  isUserBlocked,
  readUsers,
  removeSavedSpinCoupon,
  resolveSavedSpinCoupons,
  upsertSavedSpinCoupon,
  writeUsers,
  type UserProfile,
} from '@/lib/users';
import {
  findMembersByXHandle,
  KUSH_WORLD_TD_HASHTAG,
  postHasKushWorldTdHashtag,
  profileXHandle,
} from '@/lib/xHandle';
import { isXTdScanConfigured, lookupXTdPost, searchKushWorldTdPosts, type XTdPost } from '@/lib/xTdHashtag';

const ENTRIES_FILE = path.join(process.cwd(), 'data', 'td-rewards.json');

export const TD_CREDIT_DOLLARS = 5;
/** 100 loyalty points = $1. */
export const TD_CREDIT_POINTS = TD_CREDIT_DOLLARS * 100;
export const TD_EXPIRY_DAYS = 30;
export const TD_COOLDOWN_MS = 60 * 60 * 1000;

export type TdRewardStatus = 'credited' | 'used' | 'traded' | 'revoked';
export type TdRewardType = 'coupon' | 'points';
export type TdRewardSource = 'url' | 'hashtag-scan';

export interface TdRewardSubmission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  postUrl: string;
  postKey: string;
  platform: string;
  status: TdRewardStatus;
  prizeId?: string;
  submitIp?: string;
  createdAt: string;
  updatedAt: string;
  tradedAt?: string;
  usedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
  rewardType?: TdRewardType;
  pointsAwarded?: number;
  xHandle?: string;
  source?: TdRewardSource;
  hashtag?: string;
}

export interface TdUnmatchedPost {
  postId: string;
  username: string;
  postUrl: string;
  seenAt: string;
  reason: string;
}

export interface PublicTdPost {
  id: string;
  postUrl: string;
  platform: string;
  handle: string;
  pointsAwarded: number;
  createdAt: string;
}

interface TdRewardsFile {
  submissions: TdRewardSubmission[];
  unmatched?: TdUnmatchedPost[];
  lastHashtagScanAt?: string;
  lastHashtagSinceId?: string;
  updatedAt: string;
}

const EMPTY_FILE: TdRewardsFile = {
  submissions: [],
  unmatched: [],
  updatedAt: new Date().toISOString(),
};

const ALLOWED_HOSTS = new Set([
  'x.com',
  'twitter.com',
  'mobile.twitter.com',
  'mobile.x.com',
  'instagram.com',
  'instagr.am',
  'tiktok.com',
  'vm.tiktok.com',
  'youtube.com',
  'youtu.be',
  'm.youtube.com',
  'facebook.com',
  'fb.com',
  'fb.watch',
  'm.facebook.com',
  'reddit.com',
  'old.reddit.com',
  'threads.net',
]);

async function ensureFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(ENTRIES_FILE);
  } catch {
    await fs.writeFile(ENTRIES_FILE, JSON.stringify(EMPTY_FILE, null, 2));
  }
}

async function readFile(): Promise<TdRewardsFile> {
  await ensureFile();
  const data = await fs.readFile(ENTRIES_FILE, 'utf8');
  const parsed = JSON.parse(data) as Partial<TdRewardsFile>;
  return {
    submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
    unmatched: Array.isArray(parsed.unmatched) ? parsed.unmatched : [],
    lastHashtagScanAt: parsed.lastHashtagScanAt,
    lastHashtagSinceId: parsed.lastHashtagSinceId,
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
  };
}

async function writeFile(file: TdRewardsFile): Promise<void> {
  await ensureFile();
  file.updatedAt = new Date().toISOString();
  await fs.writeFile(ENTRIES_FILE, JSON.stringify(file, null, 2));
}

function stripWww(host: string): string {
  return host.replace(/^www\./i, '').toLowerCase();
}

export function parseTdPostUrl(raw: string): {
  ok: true;
  postKey: string;
  canonicalUrl: string;
  platform: string;
} | { ok: false; error: string } {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'Paste a public post link of your TouchDown.' };
  }

  let input = raw.trim();
  if (input.length > 500) {
    return { ok: false, error: 'URL is too long.' };
  }

  if (/bit\.ly|tinyurl|goo\.gl|ow\.ly|buff\.ly|rebrand\.ly|rb\.gy/i.test(input) && !/x\.com|twitter\.com|instagram|tiktok|youtube|youtu\.be|facebook|reddit|threads/i.test(input)) {
    return { ok: false, error: 'Short links are not allowed. Open the post and copy the full URL.' };
  }

  if (!/^https?:\/\//i.test(input)) {
    input = `https://${input}`;
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, error: 'That does not look like a valid URL.' };
  }

  const host = stripWww(url.hostname);
  if (!ALLOWED_HOSTS.has(host)) {
    return {
      ok: false,
      error: 'Use a public X, Instagram, TikTok, YouTube, Facebook, Threads, or Reddit post link.',
    };
  }

  if (host === 'x.com' || host === 'twitter.com' || host === 'mobile.twitter.com' || host === 'mobile.x.com') {
    const parsed = parseXPostUrl(input);
    if (!parsed.ok) return parsed;
    return {
      ok: true,
      postKey: `x:${parsed.postId}`,
      canonicalUrl: parsed.canonicalUrl,
      platform: 'x',
    };
  }

  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path.length < 4) {
    return { ok: false, error: 'Link must be a specific post, reel, or video — not a profile or home page.' };
  }

  let platform = 'media';
  let postKey = `${host}${path.toLowerCase()}`;
  let canonicalUrl = `https://${host}${path}`;

  if (host === 'instagram.com' || host === 'instagr.am') {
    const match = path.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
    if (!match) {
      return { ok: false, error: 'Instagram link must be a post or reel (instagram.com/p/… or /reel/…).' };
    }
    platform = 'instagram';
    postKey = `ig:${match[2].toLowerCase()}`;
    canonicalUrl = `https://www.instagram.com/${match[1].toLowerCase() === 'reels' ? 'reel' : match[1].toLowerCase()}/${match[2]}/`;
  } else if (host === 'tiktok.com' || host === 'vm.tiktok.com') {
    const video = path.match(/^\/@[^/]+\/video\/(\d+)/i);
    if (!video) {
      return { ok: false, error: 'TikTok link must be a video (tiktok.com/@user/video/…). Open the post and copy the full URL.' };
    }
    platform = 'tiktok';
    postKey = `tt:${video[1]}`;
    canonicalUrl = `https://www.tiktok.com${path}`;
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    const videoId =
      host === 'youtu.be'
        ? path.replace(/^\//, '').split('/')[0]
        : url.searchParams.get('v') || path.match(/^\/shorts\/([A-Za-z0-9_-]+)/i)?.[1];
    if (!videoId || videoId.length < 6) {
      return { ok: false, error: 'YouTube link must be a video or Short.' };
    }
    platform = 'youtube';
    postKey = `yt:${videoId}`;
    canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  } else if (host === 'reddit.com' || host === 'old.reddit.com') {
    const match = path.match(/\/comments\/([a-z0-9]+)/i);
    if (!match) {
      return { ok: false, error: 'Reddit link must be a post (reddit.com/r/…/comments/…).' };
    }
    platform = 'reddit';
    postKey = `rd:${match[1].toLowerCase()}`;
    canonicalUrl = `https://www.reddit.com${path}`;
  } else if (host === 'threads.net') {
    const match = path.match(/\/post\/([A-Za-z0-9_-]+)/i);
    if (!match) {
      return { ok: false, error: 'Threads link must be a post.' };
    }
    platform = 'threads';
    postKey = `th:${match[1]}`;
    canonicalUrl = `https://www.threads.net${path}`;
  } else if (host === 'facebook.com' || host === 'fb.com' || host === 'm.facebook.com' || host === 'fb.watch') {
    if (/^\/share\b/i.test(path) || url.searchParams.has('u')) {
      return { ok: false, error: 'Open the Facebook post itself and copy that URL, not a share wrapper.' };
    }
    platform = 'facebook';
    postKey = `fb:${path.toLowerCase()}`;
    canonicalUrl = `https://www.facebook.com${path}`;
  }

  return { ok: true, postKey, canonicalUrl, platform };
}

function withinMs(iso: string, ms: number, now = Date.now()): boolean {
  return now - new Date(iso).getTime() < ms;
}

function buildTdExpiry(from = new Date()): string {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + TD_EXPIRY_DAYS);
  return expires.toISOString();
}

export function getActiveTdCoupon(user: UserProfile): SpinPrize | null {
  return resolveSavedSpinCoupons(user).find((coupon) => isTdCoupon(coupon)) ?? null;
}

export function hasActiveFiveOffCoupon(user: UserProfile): boolean {
  return resolveSavedSpinCoupons(user).some((coupon) => getSpinCouponSlot(coupon.type) === 'fixed_off' && isSpinPrizeActive(coupon));
}

export async function listTdSubmissionsForUser(userId: string): Promise<TdRewardSubmission[]> {
  const file = await readFile();
  return file.submissions
    .filter((row) => row.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listPublicTdPosts(limit = 8): Promise<PublicTdPost[]> {
  const file = await readFile();
  return file.submissions
    .filter((row) => row.status === 'credited' || row.status === 'used' || row.status === 'traded')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      postUrl: row.postUrl,
      platform: row.platform,
      handle: row.xHandle ? `@${row.xHandle}` : 'KW member',
      pointsAwarded: row.pointsAwarded || 0,
      createdAt: row.createdAt,
    }));
}

export async function listAllTdSubmissions(limit = 200): Promise<{
  submissions: TdRewardSubmission[];
  unmatched: TdUnmatchedPost[];
  creditedCount: number;
  usedCount: number;
  tradedCount: number;
  revokedCount: number;
  pointsAwarded: number;
  lastHashtagScanAt?: string;
  scanConfigured: boolean;
  hashtag: string;
}> {
  const file = await readFile();
  const sorted = file.submissions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    submissions: sorted.slice(0, limit),
    unmatched: (file.unmatched || []).slice(0, 50),
    creditedCount: file.submissions.filter((row) => row.status === 'credited').length,
    usedCount: file.submissions.filter((row) => row.status === 'used').length,
    tradedCount: file.submissions.filter((row) => row.status === 'traded').length,
    revokedCount: file.submissions.filter((row) => row.status === 'revoked').length,
    pointsAwarded: file.submissions.reduce((sum, row) => sum + (row.pointsAwarded || 0), 0),
    lastHashtagScanAt: file.lastHashtagScanAt,
    scanConfigured: isXTdScanConfigured(),
    hashtag: KUSH_WORLD_TD_HASHTAG,
  };
}

export async function getTdSpinTradeValue(): Promise<{ points: number; spins: number; spinCost: number }> {
  const content = await getSiteContent();
  const spinCost = content.features.spinWheel?.spinCost || SPIN_COST;
  return {
    points: TD_CREDIT_POINTS,
    spinCost,
    spins: Math.max(1, Math.floor(TD_CREDIT_POINTS / spinCost)),
  };
}

function rememberUnmatched(file: TdRewardsFile, post: XTdPost, reason: string): void {
  const next: TdUnmatchedPost = {
    postId: post.postId,
    username: post.username,
    postUrl: post.url,
    seenAt: new Date().toISOString(),
    reason,
  };
  const rest = (file.unmatched || []).filter((row) => row.postId !== post.postId);
  file.unmatched = [next, ...rest].slice(0, 50);
}

async function pickMemberForXHandle(handle: string): Promise<UserProfile | null> {
  const users = await readUsers();
  const matches = findMembersByXHandle(users, handle).filter((user) => !isUserBlocked(user));
  if (matches.length === 0) return null;
  const withPurchase: UserProfile[] = [];
  for (const user of matches) {
    if (await customerHasAnyPurchase(user.email)) withPurchase.push(user);
  }
  const pool = withPurchase.length > 0 ? withPurchase : matches;
  return pool.find((user) => user.emailVerifiedAt || user.phoneVerifiedAt) ?? pool[0] ?? null;
}

export async function creditHashtagTdPost(input: {
  post: XTdPost;
  source: TdRewardSource;
  submitIp?: string;
  requireUserId?: string;
}): Promise<{ credited: boolean; submission?: TdRewardSubmission; reason?: string }> {
  const postKey = `x:${input.post.postId}`;
  const file = await readFile();
  const duplicate = file.submissions.find((row) => row.postKey === postKey && row.status !== 'revoked');
  if (duplicate) {
    return { credited: false, reason: 'This post was already credited.' };
  }

  if (!input.post.username) {
    rememberUnmatched(file, input.post, 'No X username on the post');
    await writeFile(file);
    return { credited: false, reason: 'Could not read the X username on that post.' };
  }

  const member = await pickMemberForXHandle(input.post.username);
  if (!member) {
    rememberUnmatched(file, input.post, `No site profile with X username @${input.post.username}`);
    await writeFile(file);
    return {
      credited: false,
      reason: `No member profile has X username @${input.post.username}. Save that handle under Account → Profile.`,
    };
  }

  if (input.requireUserId && member.id !== input.requireUserId) {
    return {
      credited: false,
      reason: `That post is from @${input.post.username}, which is linked to a different member.`,
    };
  }

  if (!(await customerHasAnyPurchase(member.email))) {
    rememberUnmatched(file, input.post, 'Matched profile has no completed order');
    await writeFile(file);
    return { credited: false, reason: 'Complete at least one order before earning TD points.' };
  }

  const nowIso = new Date().toISOString();
  const submission: TdRewardSubmission = {
    id: randomUUID(),
    userId: member.id,
    userEmail: member.email,
    userName: member.name || '',
    postUrl: input.post.url,
    postKey,
    platform: 'x',
    status: 'credited',
    submitIp: input.submitIp,
    createdAt: nowIso,
    updatedAt: nowIso,
    rewardType: 'points',
    pointsAwarded: TD_CREDIT_POINTS,
    xHandle: input.post.username,
    source: input.source,
    hashtag: KUSH_WORLD_TD_HASHTAG,
  };

  await addLoyaltyPoints(member.id, TD_CREDIT_POINTS);
  file.submissions.push(submission);
  file.unmatched = (file.unmatched || []).filter((row) => row.postId !== input.post.postId);
  await writeFile(file);
  return { credited: true, submission };
}

export async function scanKushWorldTdHashtag(): Promise<{
  scanned: number;
  credited: number;
  skipped: number;
  unmatched: number;
  error?: string;
  lastHashtagScanAt: string;
}> {
  const file = await readFile();
  const search = await searchKushWorldTdPosts({ sinceId: file.lastHashtagSinceId, maxResults: 50 });
  const nowIso = new Date().toISOString();
  file.lastHashtagScanAt = nowIso;
  if (search.newestId) file.lastHashtagSinceId = search.newestId;
  await writeFile(file);

  if (search.error) {
    return {
      scanned: 0,
      credited: 0,
      skipped: 0,
      unmatched: 0,
      error: search.error,
      lastHashtagScanAt: nowIso,
    };
  }

  let credited = 0;
  let skipped = 0;
  let unmatched = 0;
  for (const post of search.posts) {
    const result = await creditHashtagTdPost({ post, source: 'hashtag-scan' });
    if (result.credited) credited += 1;
    else if (result.reason?.includes('already credited')) skipped += 1;
    else unmatched += 1;
  }

  return {
    scanned: search.posts.length,
    credited,
    skipped,
    unmatched,
    lastHashtagScanAt: nowIso,
  };
}

export async function submitTdPost(input: {
  user: UserProfile;
  postUrl: string;
  submitIp?: string;
}): Promise<
  | { success: true; submission: TdRewardSubmission; coupon?: SpinPrize; pointsAwarded?: number }
  | { success: false; error: string }
> {
  const parsed = parseTdPostUrl(input.postUrl);
  if (!parsed.ok) return { success: false, error: parsed.error };

  if (parsed.platform === 'x') {
    const user = input.user;
    if (!user.emailVerifiedAt && !user.phoneVerifiedAt) {
      return {
        success: false,
        error: 'Verify your email or phone in Account before submitting a TouchDown post.',
      };
    }
    const handle = profileXHandle(user);
    if (!handle) {
      return {
        success: false,
        error: 'Save your X username on your profile first so we can match #KushWorldTD posts.',
      };
    }
    const post = await lookupXTdPost(parsed.canonicalUrl);
    if (!post) {
      return {
        success: false,
        error: 'Could not read that X post. Make sure it is public and includes #KushWorldTD.',
      };
    }
    if (!post.username) post.username = handle;
    if (post.username !== handle) {
      return {
        success: false,
        error: `That post is from @${post.username}. Your profile X username is @${handle}.`,
      };
    }
    if (!postHasKushWorldTdHashtag(post.text)) {
      return {
        success: false,
        error: `Add #${KUSH_WORLD_TD_HASHTAG} to the post so we can credit loyalty points.`,
      };
    }
    const result = await creditHashtagTdPost({
      post,
      source: 'url',
      submitIp: input.submitIp,
      requireUserId: user.id,
    });
    if (!result.credited || !result.submission) {
      return { success: false, error: result.reason || 'Could not credit that post.' };
    }
    return {
      success: true,
      submission: result.submission,
      pointsAwarded: result.submission.pointsAwarded,
    };
  }

  const user = input.user;
  if (!user.emailVerifiedAt && !user.phoneVerifiedAt) {
    return {
      success: false,
      error: 'Verify your email or phone in Account before submitting a TouchDown post.',
    };
  }

  const hasPurchase = await customerHasAnyPurchase(user.email);
  if (!hasPurchase) {
    return {
      success: false,
      error: 'Complete at least one order first — TD credits are for posting your pack landing.',
    };
  }

  const latestUser = (await getUserById(user.id)) ?? user;
  if (hasActiveFiveOffCoupon(latestUser)) {
    return {
      success: false,
      error: 'You already have a $5 credit. Use it at checkout or trade it for wheel spins — TD coupons do not stack.',
    };
  }

  const file = await readFile();
  const duplicate = file.submissions.find((row) => row.postKey === parsed.postKey && row.status !== 'revoked');
  if (duplicate) {
    if (duplicate.userId === user.id) {
      return { success: false, error: 'You already used this post for a TD credit.' };
    }
    return { success: false, error: 'This post was already claimed. Each TD post can only be rewarded once.' };
  }

  const mine = file.submissions.filter((row) => row.userId === user.id);
  const last = mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (last && withinMs(last.createdAt, TD_COOLDOWN_MS)) {
    return { success: false, error: 'Wait at least an hour between TouchDown submissions.' };
  }

  const nowIso = new Date().toISOString();
  const submissionId = randomUUID();
  const prizeId = `td_${submissionId}`;
  const coupon: SpinPrize = {
    id: prizeId,
    segmentId: 'td_five_off',
    type: 'fixed_5_off',
    label: '$5 TD Credit',
    value: TD_CREDIT_DOLLARS,
    wonAt: nowIso,
    acceptedAt: nowIso,
    expiresAt: buildTdExpiry(),
    source: 'td',
    tdPostUrl: parsed.canonicalUrl,
    tdSubmissionId: submissionId,
  };

  const submission: TdRewardSubmission = {
    id: submissionId,
    userId: user.id,
    userEmail: user.email,
    userName: user.name || '',
    postUrl: parsed.canonicalUrl,
    postKey: parsed.postKey,
    platform: parsed.platform,
    status: 'credited',
    prizeId,
    submitIp: input.submitIp,
    createdAt: nowIso,
    updatedAt: nowIso,
    rewardType: 'coupon',
    source: 'url',
  };

  await upsertSavedSpinCoupon(user.id, coupon);
  file.submissions.push(submission);
  await writeFile(file);
  return { success: true, submission, coupon };
}

export async function tradeTdCouponForSpins(
  userId: string
): Promise<
  | { success: true; pointsAdded: number; spinsWorth: number; spinCost: number; remainingPoints: number }
  | { success: false; error: string }
> {
  const users = await readUsers();
  const index = users.findIndex((row) => row.id === userId);
  if (index === -1) return { success: false, error: 'User not found' };

  const coupon = getActiveTdCoupon(users[index]);
  if (!coupon) {
    return { success: false, error: 'No unused $5 TD credit to trade.' };
  }

  const trade = await getTdSpinTradeValue();
  const stored = [...(users[index].savedSpinCoupons ?? [])].filter((item) => item.id !== coupon.id);
  users[index].savedSpinCoupons = stored.length > 0 ? stored : undefined;
  users[index].loyaltyPoints = (users[index].loyaltyPoints ?? 0) + trade.points;
  users[index].activeSpinPrize = undefined;
  await writeUsers(users);

  const file = await readFile();
  const subIndex = file.submissions.findIndex((row) => row.id === coupon.tdSubmissionId || row.prizeId === coupon.id);
  if (subIndex !== -1) {
    const nowIso = new Date().toISOString();
    file.submissions[subIndex] = {
      ...file.submissions[subIndex],
      status: 'traded',
      tradedAt: nowIso,
      updatedAt: nowIso,
    };
    await writeFile(file);
  }

  return {
    success: true,
    pointsAdded: trade.points,
    spinsWorth: trade.spins,
    spinCost: trade.spinCost,
    remainingPoints: getRedeemableLoyaltyPoints(users[index]),
  };
}

export async function markTdCreditUsed(prizeId: string): Promise<void> {
  if (!prizeId) return;
  const file = await readFile();
  const index = file.submissions.findIndex((row) => row.prizeId === prizeId || row.id === prizeId);
  if (index === -1) return;
  if (file.submissions[index].status !== 'credited') return;
  const nowIso = new Date().toISOString();
  file.submissions[index] = {
    ...file.submissions[index],
    status: 'used',
    usedAt: nowIso,
    updatedAt: nowIso,
  };
  await writeFile(file);
}

export async function revokeTdSubmission(
  submissionId: string,
  reason?: string
): Promise<{ success: true; submission: TdRewardSubmission } | { success: false; error: string }> {
  const file = await readFile();
  const index = file.submissions.findIndex((row) => row.id === submissionId);
  if (index === -1) return { success: false, error: 'Submission not found' };

  const row = file.submissions[index];
  if (row.status === 'revoked') return { success: false, error: 'Already revoked' };
  if (row.status === 'used' || row.status === 'traded') {
    return { success: false, error: `Cannot revoke a ${row.status} credit` };
  }

  if (row.prizeId) {
    await removeSavedSpinCoupon(row.userId, row.prizeId);
  }

  const nowIso = new Date().toISOString();
  file.submissions[index] = {
    ...row,
    status: 'revoked',
    revokedAt: nowIso,
    revokeReason: (reason || '').trim().slice(0, 500) || 'Revoked by admin',
    updatedAt: nowIso,
  };
  await writeFile(file);
  return { success: true, submission: file.submissions[index] };
}
