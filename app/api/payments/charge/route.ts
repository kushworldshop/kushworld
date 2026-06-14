import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { chargeCard } from '@/lib/authorizeNet';
import { isCustomerVerified } from '@/lib/verification';
import { sendOrderConfirmation } from '@/lib/email';
import { RESTRICTED_STATES, MIN_ORDER_AMOUNT } from '@/lib/checkout';
import { resolveOrderTotals } from '@/lib/orderCheckout';
import { orderRequiresIdVerification } from '@/lib/products';
import { recordReferralConversion } from '@/lib/referrals';
import { creditReferrerForConversion } from '@/lib/referralRewards';
import { getSessionUserId } from '@/lib/auth';
import { awardPurchaseLoyalty, finalizeLoyaltyRedemption } from '@/lib/loyalty';
import { markFreeEighthGranted } from '@/lib/firstOrderBonusServer';
import { markUserSpinPrizeUsed, unlockLoyaltyPointsAfterPurchase } from '@/lib/users';
import { resolvePromoForOrder } from '@/lib/orderPromo';
import { deductInventoryForOrder, InventoryError } from '@/lib/inventory';
import { buildOrderRecord } from '@/lib/buildOrderRecord';
import { createOrderAccessToken } from '@/lib/orderAccessToken';
import { generateOrderId } from '@/lib/orderIds';
import { validateCheckoutItems } from '@/lib/validateCheckout';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

async function ensureOrdersFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, opaqueData, referralCode } = body;

    if (!customer?.name || !customer?.email || !customer?.address) {
      return NextResponse.json(
        { success: false, error: 'Complete shipping information is required' },
        { status: 400 }
      );
    }

    if (!opaqueData?.dataDescriptor || !opaqueData?.dataValue) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment token. Please try again.' },
        { status: 400 }
      );
    }

    let validated;
    try {
      validated = await validateCheckoutItems(body.items || [], body.subtotal, customer.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid cart';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const { items, subtotal, isFirstOrder, freeEighthBonus } = validated;

    if (subtotal < MIN_ORDER_AMOUNT) {
      return NextResponse.json({ success: false, error: `Minimum order is $${MIN_ORDER_AMOUNT}` }, { status: 400 });
    }

    const state = customer.state?.toUpperCase().trim();
    if (state && RESTRICTED_STATES.includes(state)) {
      return NextResponse.json({ success: false, error: `Cannot ship to ${state}` }, { status: 400 });
    }

    let promoMeta: Awaited<ReturnType<typeof resolvePromoForOrder>> = { promoDiscount: 0 };
    try {
      promoMeta = await resolvePromoForOrder({
        promoCode: body.promoCode,
        referralCode: body.referralCode ?? referralCode,
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
        spinPrizeId: body.spinPrizeId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid order totals';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const {
      discount,
      shipping,
      total: orderTotal,
      loyaltyPointsUsed,
      spinPrizeId,
    } = resolved;
    const orderId = generateOrderId();

    try {
      await deductInventoryForOrder(items);
    } catch (err) {
      if (err instanceof InventoryError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
      throw err;
    }

    const payment = await chargeCard(orderTotal, opaqueData, customer, orderId);

    if (!payment.success) {
      const { restoreInventoryForOrder } = await import('@/lib/inventory');
      await restoreInventoryForOrder(items);
      return NextResponse.json(
        { success: false, error: payment.error || 'Payment failed' },
        { status: 402 }
      );
    }

    await ensureOrdersFile();
    const email = customer.email;
    const alreadyVerified = await isCustomerVerified(email);
    const needsIdVerification = orderRequiresIdVerification(items || []);

    const newOrder = buildOrderRecord({
      id: orderId,
      customer,
      items,
      subtotal,
      paymentMethod: 'card',
      promoMeta,
      resolved,
      paymentStatus: 'paid',
      transactionId: payment.transactionId,
      authCode: payment.authCode,
      status: 'processing',
      idVerification: !needsIdVerification
        ? { status: 'verified', note: 'Merch-only order — no ID required' }
        : alreadyVerified
          ? { status: 'verified', note: 'Returning verified customer' }
          : { status: 'required' },
    });

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    orders.unshift(newOrder);
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    if (promoMeta.referrerCode) {
      await recordReferralConversion(promoMeta.referrerCode, orderId, subtotal);
      await creditReferrerForConversion(promoMeta.referrerCode);
    }

    const userId = await getSessionUserId();
    if (userId) {
      if (loyaltyPointsUsed > 0) {
        await finalizeLoyaltyRedemption(userId, loyaltyPointsUsed);
      }
      if (spinPrizeId) {
        await markUserSpinPrizeUsed(userId, spinPrizeId, {
          orderId,
          orderTotal,
        });
      }
      await awardPurchaseLoyalty(userId, subtotal);
      await unlockLoyaltyPointsAfterPurchase(userId);
    }

    if (freeEighthBonus) {
      await markFreeEighthGranted(email, orderId, userId ?? undefined);
    }

    await sendOrderConfirmation(email, {
      id: orderId,
      total: orderTotal,
      subtotal,
      shipping,
      discount,
      paymentMethod: 'card',
      items: items.map((i: { name: string; quantity: number; price: number }) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
    });

    return NextResponse.json({
      success: true,
      orderId,
      orderAccessToken: createOrderAccessToken(orderId, email),
      transactionId: payment.transactionId,
      requiresIdUpload: needsIdVerification && !alreadyVerified,
    });
  } catch (error) {
    console.error('Payment charge error:', error);
    return NextResponse.json(
      { success: false, error: 'Payment processing failed. Please try again.' },
      { status: 500 }
    );
  }
}