import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getUserById } from '@/lib/users';
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import {
  TD_CREDIT_DOLLARS,
  TD_CREDIT_POINTS,
  TD_EXPIRY_DAYS,
  getActiveTdCoupon,
  getTdSpinTradeValue,
  listTdSubmissionsForUser,
  submitTdPost,
  tradeTdCouponForSpins,
} from '@/lib/tdRewards';

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

  const [submissions, trade] = await Promise.all([listTdSubmissionsForUser(user.id), getTdSpinTradeValue()]);
  const activeCredit = getActiveTdCoupon(user);

  return NextResponse.json({
    success: true,
    submissions,
    activeCredit,
    settings: {
      creditDollars: TD_CREDIT_DOLLARS,
      creditPoints: TD_CREDIT_POINTS,
      expiryDays: TD_EXPIRY_DAYS,
      tradePoints: trade.points,
      tradeSpins: trade.spins,
      spinCost: trade.spinCost,
    },
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`td-rewards:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit);

  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  }

  const userLimit = checkRateLimit(`td-rewards-user:${user.id}`, 8, 60 * 60 * 1000);
  if (!userLimit.allowed) return rateLimitResponse(userLimit);

  try {
    const body = await request.json().catch(() => ({}));

    if (body.action === 'trade') {
      const result = await tradeTdCouponForSpins(user.id);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      const submissions = await listTdSubmissionsForUser(user.id);
      const refreshed = await getUserById(user.id);
      return NextResponse.json({
        success: true,
        submissions,
        activeCredit: refreshed ? getActiveTdCoupon(refreshed) : null,
        pointsAdded: result.pointsAdded,
        spinsWorth: result.spinsWorth,
        spinCost: result.spinCost,
        remainingPoints: result.remainingPoints,
        message: `Traded your $5 TD credit for ${result.pointsAdded} points — enough for ${result.spinsWorth} wheel spin${result.spinsWorth === 1 ? '' : 's'}.`,
      });
    }

    const postUrl = typeof body.postUrl === 'string' ? body.postUrl : '';
    const result = await submitTdPost({ user, postUrl, submitIp: ip });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    const submissions = await listTdSubmissionsForUser(user.id);
    return NextResponse.json({
      success: true,
      submission: result.submission,
      coupon: result.coupon,
      submissions,
      activeCredit: result.coupon,
      message: `$${TD_CREDIT_DOLLARS} TD credit added. Use it at checkout (one coupon per order) or trade it for wheel spins.`,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to submit TouchDown post' }, { status: 500 });
  }
}
