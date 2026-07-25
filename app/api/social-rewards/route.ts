import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getUserById } from '@/lib/users';
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import {
  listSubmissionsForUser,
  SOCIAL_REWARD_POINTS,
  MAX_PENDING_PER_USER,
  MAX_SUBMISSIONS_PER_WEEK,
  MAX_APPROVED_PER_MONTH,
  REQUIRE_PURCHASE,
  submitSocialReward,
} from '@/lib/socialRewards';

async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getUserById(userId);
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  }

  const submissions = await listSubmissionsForUser(user.id);
  return NextResponse.json({
    success: true,
    submissions,
    settings: {
      rewardPoints: SOCIAL_REWARD_POINTS,
      maxPending: MAX_PENDING_PER_USER,
      maxPerWeek: MAX_SUBMISSIONS_PER_WEEK,
      maxApprovedPerMonth: MAX_APPROVED_PER_MONTH,
      requirePurchase: REQUIRE_PURCHASE,
    },
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`social-rewards:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit);

  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  }

  const userLimit = checkRateLimit(`social-rewards-user:${user.id}`, 8, 60 * 60 * 1000);
  if (!userLimit.allowed) return rateLimitResponse(userLimit);

  try {
    const body = await request.json();
    const postUrl = typeof body.postUrl === 'string' ? body.postUrl : '';
    const result = await submitSocialReward({
      user,
      postUrl,
      submitIp: ip,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const submissions = await listSubmissionsForUser(user.id);
    return NextResponse.json({
      success: true,
      submission: result.submission,
      submissions,
      message: `Submitted for review. If approved, you'll earn ${SOCIAL_REWARD_POINTS} loyalty points.`,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to submit post' }, { status: 500 });
  }
}