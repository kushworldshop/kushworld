import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { isSubscriptionsFeatureEnabled } from '@/lib/subscriptionAccess';
import {
  cancelSubscription,
  getActiveSubscriptionForUser,
  toPublicSubscriptionSummary,
} from '@/lib/subscriptions';

export async function POST(request: NextRequest) {
  if (!(await isSubscriptionsFeatureEnabled())) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const active = await getActiveSubscriptionForUser(userId);
  if (!active) {
    return NextResponse.json({ error: 'No active subscription found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const immediate = Boolean(body.immediate);

  const updated = await cancelSubscription(active.id, { immediate });
  if (!updated) {
    return NextResponse.json({ error: 'Could not cancel subscription.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    subscription: toPublicSubscriptionSummary(updated),
    message: immediate
      ? 'Your subscription has been cancelled.'
      : 'Your subscription will end at the close of the current billing period.',
  });
}