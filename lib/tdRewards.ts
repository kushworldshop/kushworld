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
  getRedeemableLoyaltyPoints,
  getUserById,
  readUsers,
  removeSavedSpinCoupon,
  resolveSavedSpinCoupons,
  upsertSavedSpinCoupon,
  writeUsers,
  type UserProfile,
} from '@/lib/users';

const ENTRIES_FILE = path.join(process.cwd(), 'data', 'td-rewards.json');

export const TD_CREDIT_DOLLARS = 5;
/** 100 loyalty points = $1. */
export const TD_CREDIT_POINTS = TD_CREDIT_DOLLARS * 100;
export const TD_EXPIRY_DAYS = 30;
export const TD_COOLDOWN_MS = 60 * 60 * 1000;

export type TdRewardStatus = 'credited' | 'used' | 'traded' | 'revoked';

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
}

interface TdRewardsFile {
  submissions: TdRewardSubmission[];
  updatedAt: string;
}

const EMPTY_FILE: TdRewardsFile = {
  submissions: [],
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

export async function listAllTdSubmissions(limit = 200): Promise<{
  submissions: TdRewardSubmission[];
  creditedCount: number;
  usedCount: number;
  tradedCount: number;
  revokedCount: number;
}> {
  const file = await readFile();
  const sorted = file.submissions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    submissions: sorted.slice(0, limit),
    creditedCount: file.submissions.filter((row) => row.status === 'credited').length,
    usedCount: file.submissions.filter((row) => row.status === 'used').length,
    tradedCount: file.submissions.filter((row) => row.status === 'traded').length,
    revokedCount: file.submissions.filter((row) => row.status === 'revoked').length,
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

export async function submitTdPost(input: {
  user: UserProfile;
  postUrl: string;
  submitIp?: string;
}): Promise<{ success: true; submission: TdRewardSubmission; coupon: SpinPrize } | { success: false; error: string }> {
  const parsed = parseTdPostUrl(input.postUrl);
  if (!parsed.ok) return { success: false, error: parsed.error };

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
