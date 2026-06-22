import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getUserByEmail } from '@/lib/users';
import {
  activateSubscription,
  cancelSubscription,
  createSubscriptionRecord,
  readSubscriptions,
  toPublicSubscriptionSummary,
  updateSubscriptionById,
} from '@/lib/subscriptions';
import type { SubscriptionPlanId, SubscriptionStatus } from '@/lib/subscriptionTypes';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const subscriptions = await readSubscriptions();
  return NextResponse.json({
    subscriptions: subscriptions
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((sub) => ({
        ...toPublicSubscriptionSummary(sub),
        email: sub.email,
      })),
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const planId = (body.planId || 'monthly') as SubscriptionPlanId;
  const price = Number(body.price) || 49.99;

  const record = await createSubscriptionRecord({
    userId: user.id,
    email: user.email,
    planId,
    price,
    paymentMethod: 'manual',
    processor: 'manual',
    status: 'active',
    notes: body.notes || 'Created manually by admin',
  });

  const active = await activateSubscription(record.id);

  return NextResponse.json({
    success: true,
    subscription: active ? toPublicSubscriptionSummary(active) : null,
  });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const id = String(body.id || '');
  if (!id) {
    return NextResponse.json({ error: 'Subscription id is required' }, { status: 400 });
  }

  if (body.action === 'cancel') {
    const updated = await cancelSubscription(id, { immediate: Boolean(body.immediate) });
    if (!updated) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, subscription: toPublicSubscriptionSummary(updated) });
  }

  if (body.action === 'activate') {
    const updated = await activateSubscription(id);
    if (!updated) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, subscription: toPublicSubscriptionSummary(updated) });
  }

  if (body.status) {
    const status = body.status as SubscriptionStatus;
    const updated = await updateSubscriptionById(id, (record) => ({
      ...record,
      status,
      cancelledAt: status === 'cancelled' ? new Date().toISOString() : record.cancelledAt,
    }));
    if (!updated) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, subscription: toPublicSubscriptionSummary(updated) });
  }

  return NextResponse.json({ error: 'Unsupported update' }, { status: 400 });
}