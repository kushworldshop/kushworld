import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isAdminRequest } from '@/lib/adminAuth';
import { isCustomerVerified } from '@/lib/verification';
import { buildOrderRecord } from '@/lib/buildOrderRecord';
import { createOrderAccessToken } from '@/lib/orderAccessToken';
import { generateOrderId } from '@/lib/orderIds';
import { validateCheckoutItems } from '@/lib/validateCheckout';
import { sendOrderConfirmation } from '@/lib/email';
import { RESTRICTED_STATES, MIN_ORDER_AMOUNT } from '@/lib/checkout';
import { resolveOrderTotals } from '@/lib/orderCheckout';
import { orderRequiresIdVerification } from '@/lib/products';
import { recordReferralConversion } from '@/lib/referrals';
import { creditReferrerForConversion } from '@/lib/referralRewards';
import { getSessionUserId } from '@/lib/auth';
import { awardPurchaseLoyalty, finalizeLoyaltyRedemption } from '@/lib/loyalty';
import { markUserSpinPrizeUsed, unlockLoyaltyPointsAfterPurchase } from '@/lib/users';
import { resolvePromoForOrder } from '@/lib/orderPromo';
import {
  deductInventoryForOrder,
  InventoryError,
  restoreInventoryForOrder,
} from '@/lib/inventory';
import { normalizeTrackingCarrier } from '@/lib/orderShipping';
import {
  applyShippingEmailTimestamps,
  maybeSendShippingEmail,
} from '@/lib/orderShippingEmail';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

// Ensure data folder and file exist
async function ensureOrdersFile() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
  }
}

// GET all orders (admin only)
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  await ensureOrdersFile();
  const data = await fs.readFile(ORDERS_FILE, 'utf8');
  const orders = JSON.parse(data);
  return NextResponse.json(orders);
}

// PATCH order status (admin only)
export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureOrdersFile();
    const body = await request.json();
    const {
      id,
      status,
      idVerificationStatus,
      paymentStatus,
      approveCancel,
      approveRefund,
      trackingNumber,
      trackingCarrier,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Order id required' }, { status: 400 });
    }

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    const index = orders.findIndex((order: { id: string }) => order.id === id);

    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const previousOrder = { ...orders[index] };

    if (approveCancel || approveRefund) {
      const order = orders[index];
      if (order.inventoryDeducted && !order.inventoryRestored) {
        await restoreInventoryForOrder(order.items || []);
        order.inventoryRestored = true;
        order.inventoryRestoredAt = new Date().toISOString();
      }
      order.status = approveCancel ? 'cancelled' : 'refunded';
      if (approveRefund && order.paymentStatus === 'paid') {
        order.paymentStatus = 'refunded';
      }
    } else if (status) {
      orders[index].status = status;
      if (status === 'shipped' && !orders[index].shippedAt) {
        orders[index].shippedAt = new Date().toISOString();
      }
      if (status === 'delivered' && !orders[index].deliveredAt) {
        orders[index].deliveredAt = new Date().toISOString();
      }
    }

    if (trackingNumber !== undefined) {
      const trimmed = String(trackingNumber).trim();
      orders[index].trackingNumber = trimmed || undefined;
      // Auto-detect tracking -> advance to shipped stage so Kush Tracker shows accurate "En Route" immediately (for manual + admin updates)
      if (trimmed && !orders[index].shippedAt && orders[index].status !== 'delivered' && orders[index].status !== 'shipped') {
        orders[index].status = 'shipped';
        orders[index].shippedAt = new Date().toISOString();
      }
    }

    if (trackingCarrier !== undefined) {
      orders[index].trackingCarrier = normalizeTrackingCarrier(String(trackingCarrier));
    }

    if (paymentStatus) {
      orders[index].paymentStatus = paymentStatus;
      if (paymentStatus === 'paid' && orders[index].fulfillmentPending) {
        const { fulfillPaidOrder } = await import('@/lib/orderFulfillment');
        await fulfillPaidOrder(orders[index]);
        orders[index].fulfillmentPending = false;
        if (orders[index].status === 'pending') {
          orders[index].status = 'processing';
        }
        // Auto nudge tracker stage for paid orders (ties into visual garden-to-door progress)
        if (orders[index].status === 'pending' || orders[index].status === 'received') {
          orders[index].status = 'packing';
        }
      }
    }

    if (idVerificationStatus) {
      orders[index].idVerification = {
        ...orders[index].idVerification,
        status: idVerificationStatus,
        verifiedAt: idVerificationStatus === 'verified' ? new Date().toISOString() : orders[index].idVerification?.verifiedAt,
      };

      if (idVerificationStatus === 'verified') {
        const email = orders[index].customer?.email || orders[index].email;
        if (email) {
          const { markEmailVerified } = await import('@/lib/verification');
          await markEmailVerified(email);
        }
      }
    }

    orders[index].updatedAt = new Date().toISOString();

    let shippingEmailSent = false;
    let shippingEmailError: string | undefined;
    const emailResult = await maybeSendShippingEmail(previousOrder, orders[index]);
    if (emailResult.kind) {
      if (emailResult.sent) {
        orders[index] = applyShippingEmailTimestamps(orders[index], emailResult.kind);
        shippingEmailSent = true;
      } else {
        shippingEmailError = emailResult.error;
      }
    }

    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    return NextResponse.json({
      success: true,
      order: orders[index],
      shippingEmailSent,
      shippingEmailError,
    });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 });
  }
}

// DELETE order - **STRICTLY ADMIN ONLY**
// Customers must NEVER be allowed to delete their own orders (or any orders).
// This endpoint is protected by isAdminRequest (admin session cookie or dev header).
// All customer-facing order views (/account, /api/orders/me, /track/*) are read-only for orders.
// Delete UI/buttons are only present in admin components (OrdersTab, CustomersTab).
export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized - admin only' }, { status: 401 });
  }

  try {
    await ensureOrdersFile();

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      // fallback to body for flexibility
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Order id required' }, { status: 400 });
    }

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    let orders = JSON.parse(data);
    const index = orders.findIndex((order: { id: string }) => order.id === id);

    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const order = orders[index];

    // Restore inventory if it was deducted (mirrors cancel/refund logic)
    if (order.inventoryDeducted && !order.inventoryRestored) {
      try {
        await restoreInventoryForOrder(order.items || []);
      } catch (invErr) {
        console.error('Inventory restore on delete failed:', invErr);
        // continue with delete anyway
      }
    }

    orders.splice(index, 1);
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    // Optional: notify customer (commented to avoid spammy "confirmation" email; admin can manually notify)
    // const email = order.customer?.email || order.email;
    // if (email) {
    //   await sendOrderConfirmation(email, { id, total: order.total || 0, items: order.items || [], note: 'This order was deleted by the Kush World team.' }).catch(() => {});
    // }

    return NextResponse.json({ success: true, message: `Order #${id} deleted` });
  } catch (error) {
    console.error('Order delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete order' }, { status: 500 });
  }
}

// POST new order (from checkout)
export async function POST(request: NextRequest) {
  try {
    await ensureOrdersFile();
    const body = await request.json();

    // Support for admin manual order creation (add orders to user accounts + notify)
    const isAdmin = isAdminRequest(request);
    if (isAdmin && body.manual) {
      const orderId = generateOrderId();
      const customer = body.customer || {};
      const email = (customer.email || body.email || '').trim().toLowerCase();
      const items = Array.isArray(body.items) ? body.items : [];
      const subtotal = body.subtotal || items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
      const shipping = body.shipping || 9.99;
      const total = body.total || (subtotal + shipping);
      const paymentMethod = body.paymentMethod || 'manual';
      const paymentStatus = body.paymentStatus || 'paid';
      const freeEighthBonus = !!body.freeEighthBonus;
      const freeEighthNote = freeEighthBonus ? (body.freeEighthNote || 'Free 1/8th manually added to account by admin') : undefined;
      const hasTrackingAtCreate = !!body.trackingNumber?.trim();
      // If tracking provided at creation, default to shipped so tracker stages are accurate from the start
      const effectiveStatus = body.status || (hasTrackingAtCreate ? 'shipped' : 'confirmed');

      const newOrder: any = {
        id: orderId,
        customer,
        items: items.map((i: any) => ({ name: i.name, quantity: i.quantity || 1, price: i.price || 0, image: '/logo.png' })),
        subtotal,
        shipping,
        total,
        paymentMethod,
        paymentStatus,
        status: effectiveStatus,
        email,
        name: customer.name,
        address: customer.address,
        address2: customer.address2,
        city: customer.city,
        state: customer.state,
        zip: customer.zip,
        phone: customer.phone,
        freeEighthBonus: freeEighthBonus || undefined,
        freeEighthNote,
        adminCreated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inventoryDeducted: false, // admin manual - inventory managed separately if needed
        idVerification: { status: 'verified', note: 'Admin created order' },
        trackingNumber: body.trackingNumber?.trim() || undefined,
        trackingCarrier: body.trackingCarrier ? normalizeTrackingCarrier(body.trackingCarrier) : undefined,
        shippedAt: (effectiveStatus === 'shipped' || hasTrackingAtCreate) ? new Date().toISOString() : undefined,
        deliveredAt: effectiveStatus === 'delivered' ? new Date().toISOString() : undefined,
      };

      let ordersData: any[] = [];
      try {
        const dataStr = await fs.readFile(ORDERS_FILE, 'utf8');
        ordersData = JSON.parse(dataStr);
      } catch {}
      ordersData.unshift(newOrder);
      await fs.writeFile(ORDERS_FILE, JSON.stringify(ordersData, null, 2));

      // Notify user that order was created + added to their account
      if (email) {
        await sendOrderConfirmation(email, {
          id: orderId,
          total,
          subtotal,
          shipping,
          discount: 0,
          paymentMethod,
          items: items.map((i: any) => ({ name: i.name, quantity: i.quantity || 1, price: i.price || 0 })),
          note: 'This order was manually created and added to your Kush World account by our team. Track it in your account or with the secure link.',
        });
      }

      const orderAccessToken = email ? createOrderAccessToken(orderId, email) : undefined;

      return NextResponse.json({
        success: true,
        orderId,
        orderAccessToken,
        message: 'Manual order created, added to account, and user notified. Kush Tracker ready.',
      });
    }

    const customer = body.customer ?? {};
    const email = customer.email ?? body.email;

    let validated;
    try {
      validated = await validateCheckoutItems(body.items || [], body.subtotal, email, customer.phone);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid cart';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { items: orderItems, subtotal, isFirstOrder, freeEighthBonus } = validated;

    let promoMeta: Awaited<ReturnType<typeof resolvePromoForOrder>> = { promoDiscount: 0 };
    try {
      promoMeta = await resolvePromoForOrder({
        promoCode: body.promoCode,
        referralCode: body.referralCode,
        couponCode: body.couponCode,
        subtotal,
        isFirstOrder,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid promo code';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    let resolved;
    try {
      resolved = await resolveOrderTotals({
        subtotal,
        promoDiscount: promoMeta.promoDiscount,
        loyaltyPointsUsed: body.loyaltyPointsUsed ?? 0,
        shippingCarrier: body.shippingCarrier,
        shippingAmount: body.shippingAmount,
        shippingMethodLabel: body.shippingMethodLabel,
        shippingCarrierFamily: body.shippingCarrierFamily,
        spinPrizeId: body.spinPrizeId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid order totals';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const {
      total,
      loyaltyPointsUsed,
      spinPrizeId,
    } = resolved;

    if (subtotal < MIN_ORDER_AMOUNT) {
      return NextResponse.json({ success: false, error: `Minimum order is $${MIN_ORDER_AMOUNT}` }, { status: 400 });
    }

    const state = (customer.state ?? body.state)?.toUpperCase().trim();
    if (state && RESTRICTED_STATES.includes(state)) {
      return NextResponse.json({ success: false, error: `Cannot ship to ${state}` }, { status: 400 });
    }

    const alreadyVerified = email ? await isCustomerVerified(email) : false;
    const needsIdVerification = orderRequiresIdVerification(orderItems);
    const orderId = generateOrderId();

    try {
      await deductInventoryForOrder(orderItems);
    } catch (err) {
      if (err instanceof InventoryError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
      throw err;
    }

    const allowedPaymentMethods = ['zelle', 'paypal', 'chime', 'manual'];
    const paymentMethod = allowedPaymentMethods.includes(body.paymentMethod)
      ? body.paymentMethod
      : 'manual';

    const newOrder = buildOrderRecord({
      id: orderId,
      customer,
      items: orderItems,
      subtotal,
      paymentMethod,
      promoMeta,
      resolved,
      idVerification: !needsIdVerification
        ? { status: 'verified', note: 'Merch-only order — no ID required' }
        : alreadyVerified
          ? { status: 'verified', note: 'Returning verified customer' }
          : { status: 'required' },
    });

    let data: string;
    let orders: Record<string, unknown>[];
    try {
      data = await fs.readFile(ORDERS_FILE, 'utf8');
      orders = JSON.parse(data);
      orders.unshift(newOrder);
      await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
    } catch (saveError) {
      await restoreInventoryForOrder(orderItems);
      throw saveError;
    }

    if (promoMeta.referrerCode) {
      await recordReferralConversion(promoMeta.referrerCode, newOrder.id, subtotal);
      await creditReferrerForConversion(promoMeta.referrerCode);
    }

    const userId = await getSessionUserId();
    if (userId) {
      if (loyaltyPointsUsed > 0) {
        await finalizeLoyaltyRedemption(userId, loyaltyPointsUsed);
      }
      if (spinPrizeId) {
        await markUserSpinPrizeUsed(userId, spinPrizeId, {
          orderId: newOrder.id,
          orderTotal: total,
        });
      }
      await awardPurchaseLoyalty(userId, subtotal);
      await unlockLoyaltyPointsAfterPurchase(userId);
    }

    if (email) {
      await sendOrderConfirmation(email, {
        id: newOrder.id,
        total,
        subtotal,
        shipping: resolved.shipping,
        discount: resolved.discount,
        paymentMethod,
        items: orderItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
      });
    }

    const orderAccessToken = email ? createOrderAccessToken(newOrder.id, email) : undefined;

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      orderAccessToken,
      requiresIdUpload: needsIdVerification && !alreadyVerified,
    });
  } catch (error) {
    console.error('Order save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save order' }, { status: 500 });
  }
}