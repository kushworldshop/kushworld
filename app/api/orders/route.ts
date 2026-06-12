'use server';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isCustomerVerified } from '@/lib/verification';
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

// GET all orders (for admin)
export async function GET() {
  await ensureOrdersFile();
  const data = await fs.readFile(ORDERS_FILE, 'utf8');
  const orders = JSON.parse(data);
  return NextResponse.json(orders);
}

// PATCH order status (for admin)
export async function PATCH(request: NextRequest) {
  try {
    await ensureOrdersFile();
    const body = await request.json();
    const { id, status, idVerificationStatus, paymentStatus, approveCancel, approveRefund } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Order id required' }, { status: 400 });
    }

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    const index = orders.findIndex((order: { id: string }) => order.id === id);

    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

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
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    return NextResponse.json({ success: true, order: orders[index] });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 });
  }
}

// POST new order (from checkout)
export async function POST(request: NextRequest) {
  try {
    await ensureOrdersFile();
    const body = await request.json();
    const customer = body.customer ?? {};
    
    const email = customer.email ?? body.email;
    const subtotal = body.subtotal ?? 0;

    let promoMeta: Awaited<ReturnType<typeof resolvePromoForOrder>> = { promoDiscount: 0 };
    try {
      promoMeta = await resolvePromoForOrder({
        promoCode: body.promoCode,
        referralCode: body.referralCode,
        couponCode: body.couponCode,
        subtotal,
        isFirstOrder: !!body.isFirstOrder,
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
        shipping: body.shipping,
        shippingCarrier: body.shippingCarrier,
        spinPrizeId: body.spinPrizeId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid order totals';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const {
      discount,
      shipping,
      shippingCarrier,
      shippingMethod,
      total,
      loyaltyPointsUsed,
      loyaltyDiscount,
      promoDiscount,
      spinDiscount,
      spinPrizeId,
      spinPrizeLabel,
      freeTshirt,
    } = resolved;

    if (subtotal < MIN_ORDER_AMOUNT) {
      return NextResponse.json({ success: false, error: `Minimum order is $${MIN_ORDER_AMOUNT}` }, { status: 400 });
    }

    const state = (customer.state ?? body.state)?.toUpperCase().trim();
    if (state && RESTRICTED_STATES.includes(state)) {
      return NextResponse.json({ success: false, error: `Cannot ship to ${state}` }, { status: 400 });
    }

    const alreadyVerified = email ? await isCustomerVerified(email) : false;
    const needsIdVerification = orderRequiresIdVerification(body.items || []);
    const orderItems = body.items || [];

    try {
      await deductInventoryForOrder(orderItems);
    } catch (err) {
      if (err instanceof InventoryError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
      throw err;
    }

    const newOrder = {
      id: `KW-${Date.now().toString().slice(-8)}`,
      ...body,
      subtotal,
      promoDiscount,
      loyaltyPointsUsed,
      loyaltyDiscount,
      spinDiscount: spinDiscount || undefined,
      spinPrizeId,
      spinPrizeLabel,
      freeTshirtNote: freeTshirt ? 'Wheel prize: Free T-Shirt — include in shipment' : undefined,
      promoCode: promoMeta.promoCode,
      promoSource: promoMeta.promoSource,
      referrerCode: promoMeta.referrerCode,
      referrerName: promoMeta.referrerName,
      discount,
      shipping,
      shippingCarrier,
      shippingMethod,
      total,
      email,
      name: customer.name ?? body.name,
      address: customer.address ?? body.address,
      city: customer.city ?? body.city,
      state: customer.state ?? body.state,
      zip: customer.zip ?? body.zip,
      phone: customer.phone ?? body.phone,
      status: 'pending',
      inventoryDeducted: true,
      inventoryRestored: false,
      idVerification: !needsIdVerification
        ? { status: 'verified', note: 'Merch-only order — no ID required' }
        : alreadyVerified
          ? { status: 'verified', note: 'Returning verified customer' }
          : { status: 'required' },
      createdAt: new Date().toISOString(),
    };

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
        await markUserSpinPrizeUsed(userId, spinPrizeId);
      }
      await awardPurchaseLoyalty(userId, subtotal);
      await unlockLoyaltyPointsAfterPurchase(userId);
    }

    if (email) {
      await sendOrderConfirmation(email, {
        id: newOrder.id,
        total,
        subtotal,
        shipping,
        discount,
        paymentMethod: body.paymentMethod || 'manual',
        items: (body.items || []).map((i: { name: string; quantity: number; price: number }) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      requiresIdUpload: needsIdVerification && !alreadyVerified,
    });
  } catch (error) {
    console.error('Order save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save order' }, { status: 500 });
  }
}