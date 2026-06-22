import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { isSubscriptionsFeatureEnabled } from '@/lib/subscriptionAccess';
import {
  getActiveSubscriptionForUser,
  getSubscriptionsForUser,
  toPublicSubscriptionSummary,
} from '@/lib/subscriptions';

export async function GET() {
  if (!(await isSubscriptionsFeatureEnabled())) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const [active, history] = await Promise.all([
    getActiveSubscriptionForUser(userId),
    getSubscriptionsForUser(userId),
  ]);

  return NextResponse.json({
    active: active ? toPublicSubscriptionSummary(active) : null,
    history: history.map(toPublicSubscriptionSummary),
  });
}