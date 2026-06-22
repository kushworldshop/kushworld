import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getUserById } from '@/lib/users';
import { isSubscriptionsFeatureEnabled, getSubscriptionFeatureConfig } from '@/lib/subscriptionAccess';
import {
  createSubscriptionRecord,
  getActiveSubscriptionForUser,
  activateSubscription,
} from '@/lib/subscriptions';
import {
  createSubscriptionWithProcessor,
  getSubscriptionProcessorConfig,
} from '@/lib/subscriptionProcessor';
import type { SubscriptionPlanId } from '@/lib/subscriptionTypes';

export async function POST(request: NextRequest) {
  if (!(await isSubscriptionsFeatureEnabled())) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const existing = await getActiveSubscriptionForUser(userId);
  if (existing && (existing.status === 'active' || existing.status === 'trialing')) {
    return NextResponse.json({ error: 'You already have an active subscription.' }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const planId = (body.planId || 'monthly') as SubscriptionPlanId;
  if (planId !== 'monthly') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const feature = await getSubscriptionFeatureConfig();
  const price = feature.monthlyPrice ?? 49.99;
  const processor = getSubscriptionProcessorConfig();

  if (!processor.configured) {
    return NextResponse.json(
      {
        success: false,
        error: processor.message,
        code: 'PROCESSOR_NOT_READY',
      },
      { status: 503 }
    );
  }

  const billed = await createSubscriptionWithProcessor({
    userId,
    email: user.email,
    planId,
    price,
    paymentNonce: body.paymentNonce,
  });

  if (!billed.ok) {
    return NextResponse.json(
      { success: false, error: billed.error || 'Billing failed', code: 'BILLING_FAILED' },
      { status: 502 }
    );
  }

  const record = await createSubscriptionRecord({
    userId,
    email: user.email,
    planId,
    price,
    paymentMethod: 'card',
    processor: processor.processor === 'none' ? undefined : processor.processor,
    externalSubscriptionId: billed.externalSubscriptionId,
    externalCustomerId: billed.externalCustomerId,
    status: 'pending',
  });

  const active = await activateSubscription(record.id);

  return NextResponse.json({
    success: true,
    subscription: active,
  });
}