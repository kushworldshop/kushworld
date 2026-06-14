import { NextRequest, NextResponse } from 'next/server';
import { getOrderById } from '@/lib/ordersStore';
import { verifyOrderAccessToken } from '@/lib/orderAccessToken';
import { getSessionUserId } from '@/lib/auth';
import { getUserById } from '@/lib/users';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('id') || searchParams.get('orderId');
  const token = searchParams.get('token') || searchParams.get('accessToken');

  if (!orderId) {
    return NextResponse.json({ success: false, error: 'Order ID required' }, { status: 400 });
  }

  const order = await getOrderById<any>(orderId);
  if (!order) {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  }

  const orderEmail = (order.customer?.email || order.email || '').toLowerCase().trim();

  let authorized = false;
  let authMethod: 'token' | 'session' = 'token';

  // 1. Token auth (works for guests who have the link from checkout/email)
  if (token && orderEmail) {
    if (verifyOrderAccessToken(orderId, orderEmail, token)) {
      authorized = true;
      authMethod = 'token';
    }
  }

  // 2. Logged-in session auth (if the order belongs to the current user)
  if (!authorized) {
    try {
      const userId = await getSessionUserId();
      if (userId) {
        const user = await getUserById(userId);
        if (user && user.email && orderEmail === user.email.toLowerCase().trim()) {
          authorized = true;
          authMethod = 'session';
        }
      }
    } catch {
      // ignore auth errors, fall through to unauthorized
    }
  }

  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Unauthorized. Use secure link from confirmation or log in.' }, { status: 401 });
  }

  // Return a privacy-safe, tracker-focused subset. Never leak full address/phone in public tracker.
  const safeOrder = {
    id: order.id,
    status: order.status || 'pending',
    createdAt: order.createdAt,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    paymentStatus: order.paymentStatus,
    trackingNumber: order.trackingNumber,
    trackingCarrier: order.trackingCarrier,
    items: (order.items || []).map((it: any) => ({
      name: it.name,
      quantity: it.quantity,
    })),
    freeEighthBonus: !!order.freeEighthBonus,
    freeEighthNote: order.freeEighthNote,
    total: order.total,
    subtotal: order.subtotal,
    // light shipping hint only (city/state is fine)
    shipTo: order.customer?.state || order.state || undefined,
    authMethod,
  };

  return NextResponse.json({ success: true, order: safeOrder });
}
