import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { addLoyaltyPoints, getUserById, type UserProfile } from '@/lib/users';
import { customerHasAnyPurchase } from '@/lib/purchaseVerification';

const ENTRIES_FILE = path.join(process.cwd(), 'data', 'social-rewards.json');

/** Loyalty points awarded per approved post ($2 at 100 pts = $1). */
export const SOCIAL_REWARD_POINTS = Number(process.env.SOCIAL_REWARD_POINTS || 200);
/** Max submissions waiting for admin review per user. */
export const MAX_PENDING_PER_USER = 2;
/** Max new submissions per rolling 7 days per user. */
export const MAX_SUBMISSIONS_PER_WEEK = 3;
/** Max approved rewards per rolling 30 days per user. */
export const MAX_APPROVED_PER_MONTH = 8;
/** Minimum time between submissions from the same user. */
export const SUBMISSION_COOLDOWN_MS = 60 * 60 * 1000;
/** Require at least one completed purchase before earning. */
export const REQUIRE_PURCHASE = process.env.SOCIAL_REWARD_REQUIRE_PURCHASE !== '0';
/** Brand handles / keywords expected in genuine haul posts (admin guidance + soft notes). */
export const BRAND_HANDLES = ['@kushworld', 'kushworld', 'kush world', 'kushworld.shop'];

export type SocialRewardStatus = 'pending' | 'approved' | 'rejected';

export interface SocialRewardSubmission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  postUrl: string;
  postId: string;
  postAuthor?: string;
  status: SocialRewardStatus;
  pointsAwarded: number;
  rejectReason?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  /** IP at submission time (abuse signals) */
  submitIp?: string;
}

interface SocialRewardsFile {
  submissions: SocialRewardSubmission[];
  updatedAt: string;
}

const EMPTY_FILE: SocialRewardsFile = {
  submissions: [],
  updatedAt: new Date().toISOString(),
};

async function ensureFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(ENTRIES_FILE);
  } catch {
    await fs.writeFile(ENTRIES_FILE, JSON.stringify(EMPTY_FILE, null, 2));
  }
}

async function readFile(): Promise<SocialRewardsFile> {
  await ensureFile();
  const data = await fs.readFile(ENTRIES_FILE, 'utf8');
  const parsed = JSON.parse(data) as Partial<SocialRewardsFile>;
  return {
    submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
  };
}

async function writeFile(file: SocialRewardsFile): Promise<void> {
  await ensureFile();
  file.updatedAt = new Date().toISOString();
  await fs.writeFile(ENTRIES_FILE, JSON.stringify(file, null, 2));
}

/**
 * Normalize and extract a canonical X/Twitter status ID.
 * Rejects non-status URLs, shorteners, and junk paths.
 */
export function parseXPostUrl(raw: string): {
  ok: true;
  postId: string;
  postAuthor?: string;
  canonicalUrl: string;
} | { ok: false; error: string } {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'Paste a valid X (Twitter) post link.' };
  }

  let input = raw.trim();
  if (input.length > 500) {
    return { ok: false, error: 'URL is too long.' };
  }

  // Block obvious shorteners / open redirects
  if (/bit\.ly|t\.co\/(?![\w-]+$)|tinyurl|goo\.gl|ow\.ly|buff\.ly|rebrand\.ly/i.test(input) && !/x\.com|twitter\.com/i.test(input)) {
    return { ok: false, error: 'Short links are not allowed. Open the post on X and copy the full URL.' };
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

  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  const allowedHosts = new Set(['x.com', 'twitter.com', 'mobile.twitter.com', 'mobile.x.com']);
  if (!allowedHosts.has(host)) {
    return { ok: false, error: 'Only x.com or twitter.com post links are accepted.' };
  }

  // /username/status/1234567890 or /i/web/status/1234567890 or /i/status/123
  const pathMatch = url.pathname.match(
    /^(?:\/i\/(?:web\/)?status|\/([A-Za-z0-9_]{1,15})\/status)\/(\d{5,25})\/?/i
  );

  if (!pathMatch) {
    return {
      ok: false,
      error: 'Link must be a post URL (…/status/1234567890), not a profile, community, or home page.',
    };
  }

  const postAuthor = pathMatch[1]?.toLowerCase();
  const postId = pathMatch[2];

  if (!/^\d+$/.test(postId)) {
    return { ok: false, error: 'Invalid post ID.' };
  }

  // Reject known-bad placeholder IDs
  if (postId === '0' || postId.length < 5) {
    return { ok: false, error: 'Invalid post ID.' };
  }

  const canonicalUrl = postAuthor
    ? `https://x.com/${postAuthor}/status/${postId}`
    : `https://x.com/i/web/status/${postId}`;

  return { ok: true, postId, postAuthor, canonicalUrl };
}

function withinMs(iso: string, ms: number, now = Date.now()): boolean {
  return now - new Date(iso).getTime() < ms;
}

export async function listSubmissionsForUser(userId: string): Promise<SocialRewardSubmission[]> {
  const file = await readFile();
  return file.submissions
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAllSubmissions(options?: {
  status?: SocialRewardStatus | 'all';
  limit?: number;
}): Promise<{
  submissions: SocialRewardSubmission[];
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalPointsAwarded: number;
}> {
  const file = await readFile();
  const status = options?.status || 'all';
  const limit = options?.limit ?? 200;

  const filtered =
    status === 'all'
      ? file.submissions
      : file.submissions.filter((s) => s.status === status);

  const sorted = filtered
    .slice()
    .sort((a, b) => {
      // Pending first, then newest
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, limit);

  return {
    submissions: sorted,
    pendingCount: file.submissions.filter((s) => s.status === 'pending').length,
    approvedCount: file.submissions.filter((s) => s.status === 'approved').length,
    rejectedCount: file.submissions.filter((s) => s.status === 'rejected').length,
    totalPointsAwarded: file.submissions
      .filter((s) => s.status === 'approved')
      .reduce((sum, s) => sum + (s.pointsAwarded || 0), 0),
  };
}

export async function submitSocialReward(input: {
  user: UserProfile;
  postUrl: string;
  submitIp?: string;
}): Promise<{ success: true; submission: SocialRewardSubmission } | { success: false; error: string }> {
  const parsed = parseXPostUrl(input.postUrl);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const user = input.user;
  if (!user.emailVerifiedAt && !user.phoneVerifiedAt) {
    return {
      success: false,
      error: 'Verify your email or phone in Account before submitting haul posts.',
    };
  }

  if (REQUIRE_PURCHASE) {
    const hasPurchase = await customerHasAnyPurchase(user.email);
    if (!hasPurchase) {
      return {
        success: false,
        error: 'Complete at least one order before earning points from social posts. This stops fake accounts from farming rewards.',
      };
    }
  }

  const file = await readFile();
  const now = Date.now();
  const mine = file.submissions.filter((s) => s.userId === user.id);

  // Global uniqueness: one post ID can only ever be rewarded once
  const existingPost = file.submissions.find((s) => s.postId === parsed.postId);
  if (existingPost) {
    if (existingPost.userId === user.id) {
      return {
        success: false,
        error:
          existingPost.status === 'approved'
            ? 'You already earned points for this post.'
            : existingPost.status === 'pending'
              ? 'This post is already waiting for review.'
              : 'This post was already submitted and cannot be reused.',
      };
    }
    return {
      success: false,
      error: 'This post was already claimed by another account. Each post can only be rewarded once.',
    };
  }

  const pending = mine.filter((s) => s.status === 'pending');
  if (pending.length >= MAX_PENDING_PER_USER) {
    return {
      success: false,
      error: `You already have ${MAX_PENDING_PER_USER} posts waiting for review. Wait for admin approval before submitting more.`,
    };
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const monthMs = 30 * 24 * 60 * 60 * 1000;
  const weekSubs = mine.filter((s) => withinMs(s.createdAt, weekMs, now));
  if (weekSubs.length >= MAX_SUBMISSIONS_PER_WEEK) {
    return {
      success: false,
      error: `Weekly limit reached (${MAX_SUBMISSIONS_PER_WEEK} submissions per 7 days). Try again later.`,
    };
  }

  const monthApproved = mine.filter(
    (s) => s.status === 'approved' && withinMs(s.reviewedAt || s.createdAt, monthMs, now)
  );
  if (monthApproved.length >= MAX_APPROVED_PER_MONTH) {
    return {
      success: false,
      error: `Monthly reward limit reached (${MAX_APPROVED_PER_MONTH} approved posts per 30 days).`,
    };
  }

  const last = mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (last && withinMs(last.createdAt, SUBMISSION_COOLDOWN_MS, now)) {
    const mins = Math.ceil(SUBMISSION_COOLDOWN_MS / 60000);
    return {
      success: false,
      error: `Slow down — wait at least ${mins} minute(s) between submissions.`,
    };
  }

  // Soft signal: post author handle vs profile twitter (does not block — admin sees note)
  const profileHandle = (user.socials?.twitter || '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
  let adminNote: string | undefined;
  if (parsed.postAuthor && profileHandle && parsed.postAuthor !== profileHandle) {
    adminNote = `Post author @${parsed.postAuthor} does not match profile X handle @${profileHandle}. Review carefully.`;
  } else if (parsed.postAuthor && !profileHandle) {
    adminNote = 'Customer has no X handle saved on their profile.';
  }

  const nowIso = new Date().toISOString();
  const submission: SocialRewardSubmission = {
    id: randomUUID(),
    userId: user.id,
    userEmail: user.email,
    userName: user.name || '',
    postUrl: parsed.canonicalUrl,
    postId: parsed.postId,
    postAuthor: parsed.postAuthor,
    status: 'pending',
    pointsAwarded: 0,
    adminNote,
    createdAt: nowIso,
    updatedAt: nowIso,
    submitIp: input.submitIp,
  };

  file.submissions.push(submission);
  await writeFile(file);
  return { success: true, submission };
}

export async function reviewSocialReward(input: {
  submissionId: string;
  action: 'approve' | 'reject';
  rejectReason?: string;
}): Promise<{ success: true; submission: SocialRewardSubmission } | { success: false; error: string }> {
  const file = await readFile();
  const index = file.submissions.findIndex((s) => s.id === input.submissionId);
  if (index === -1) {
    return { success: false, error: 'Submission not found' };
  }

  const row = file.submissions[index];
  if (row.status !== 'pending') {
    return { success: false, error: `Already ${row.status}` };
  }

  const nowIso = new Date().toISOString();

  if (input.action === 'reject') {
    const reason = (input.rejectReason || '').trim().slice(0, 500) || 'Did not meet reward guidelines';
    file.submissions[index] = {
      ...row,
      status: 'rejected',
      rejectReason: reason,
      pointsAwarded: 0,
      reviewedAt: nowIso,
      updatedAt: nowIso,
    };
    await writeFile(file);
    return { success: true, submission: file.submissions[index] };
  }

  // Approve — re-check global uniqueness race
  const duplicateApproved = file.submissions.some(
    (s) => s.postId === row.postId && s.status === 'approved' && s.id !== row.id
  );
  if (duplicateApproved) {
    return { success: false, error: 'This post was already approved under another submission.' };
  }

  const user = await getUserById(row.userId);
  if (!user) {
    return { success: false, error: 'User account no longer exists' };
  }

  const points = SOCIAL_REWARD_POINTS;
  await addLoyaltyPoints(row.userId, points);

  file.submissions[index] = {
    ...row,
    status: 'approved',
    pointsAwarded: points,
    reviewedAt: nowIso,
    updatedAt: nowIso,
  };
  await writeFile(file);
  return { success: true, submission: file.submissions[index] };
}
