import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { chargeCard } from '@/lib/authorizeNet';
import { isCustomerVerified } from '@/lib/verification';
import { sendOrderConfirmation } from '@/lib/email';
import { RESTRICTED_STATES, MIN_ORDER_AMOUNT } from '@/lib/checkout';
import { orderRequiresIdVerification } from '@/lib/products';
import { recordReferralConversion } from '@/lib/referrals';
import { creditReferrerForConversion } from '@/lib/referralRewards';
import { getSessionUserId } from '@/lib/auth';
import { awardPurchaseLoyalty } from '@/lib/loyalty';

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
    const { customer, items, subtotal, discount = 0, shipping = 0, total, opaqueData, referralCode } = body;

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

    if (!items?.length || !subtotal || subtotal <= 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty or total is invalid' },
        { status: 400 }
      );
    }

    if (subtotal < MIN_ORDER_AMOUNT) {
      return NextResponse.json({ success: false, error: `Minimum order is $${MIN_ORDER_AMOUNT}` }, { status: 400 });
    }

    const state = customer.state?.toUpperCase().trim();
    if (state && RESTRICTED_STATES.includes(state)) {
      return NextResponse.json({ success: false, error: `Cannot ship to ${state}` }, { status: 400 });
    }

    const orderTotal = total ?? subtotal - discount + shipping;
    const orderId = `KW-${Date.now().toString().slice(-8)}`;
    const payment = await chargeCard(orderTotal, opaqueData, customer, orderId);

    if (!payment.success) {
      return NextResponse.json(
        { success: false, error: payment.error || 'Payment failed' },
        { status: 402 }
      );
    }

    await ensureOrdersFile();
    const email = customer.email;
    const alreadyVerified = await isCustomerVerified(email);
    const needsIdVerification = orderRequiresIdVerification(items || []);

    const newOrder = {
      id: orderId,
      customer,
      items,
      subtotal,
      discount,
      shipping,
      total: orderTotal,
      paymentMethod: 'card',
      referralCode: referralCode || undefined,
      paymentStatus: 'paid',
      transactionId: payment.transactionId,
      authCode: payment.authCode,
      email,
      name: customer.name,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
      phone: customer.phone,
      status: 'processing',
      idVerification: !needsIdVerification
        ? { status: 'verified', note: 'Merch-only order — no ID required' }
        : alreadyVerified
          ? { status: 'verified', note: 'Returning verified customer' }
          : { status: 'required' },
      createdAt: new Date().toISOString(),
    };

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    orders.unshift(newOrder);
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    if (referralCode) {
      await recordReferralConversion(referralCode, orderId);
      await creditReferrerForConversion(referralCode);
    }

    const userId = await getSessionUserId();
    if (userId) {
      await awardPurchaseLoyalty(userId, subtotal);
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