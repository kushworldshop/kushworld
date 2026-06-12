'use server';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isCustomerVerified } from '@/lib/verification';
import { sendOrderConfirmation } from '@/lib/email';
import { RESTRICTED_STATES, MIN_ORDER_AMOUNT } from '@/lib/checkout';
import { orderRequiresIdVerification } from '@/lib/products';
import { recordReferralConversion } from '@/lib/referrals';
import { creditReferrerForConversion } from '@/lib/referralRewards';
import { getSessionUserId } from '@/lib/auth';
import { awardPurchaseLoyalty } from '@/lib/loyalty';

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
    const { id, status, idVerificationStatus } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Order id required' }, { status: 400 });
    }

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    const index = orders.findIndex((order: { id: string }) => order.id === id);

    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (status) {
      orders[index].status = status;
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
    const discount = body.discount ?? 0;
    const shipping = body.shipping ?? 0;
    const total = body.total ?? subtotal - discount + shipping;

    if (subtotal < MIN_ORDER_AMOUNT) {
      return NextResponse.json({ success: false, error: `Minimum order is $${MIN_ORDER_AMOUNT}` }, { status: 400 });
    }

    const state = (customer.state ?? body.state)?.toUpperCase().trim();
    if (state && RESTRICTED_STATES.includes(state)) {
      return NextResponse.json({ success: false, error: `Cannot ship to ${state}` }, { status: 400 });
    }

    const alreadyVerified = email ? await isCustomerVerified(email) : false;
    const needsIdVerification = orderRequiresIdVerification(body.items || []);

    const newOrder = {
      id: `KW-${Date.now().toString().slice(-8)}`,
      ...body,
      subtotal,
      discount,
      shipping,
      total,
      email,
      name: customer.name ?? body.name,
      address: customer.address ?? body.address,
      city: customer.city ?? body.city,
      state: customer.state ?? body.state,
      zip: customer.zip ?? body.zip,
      phone: customer.phone ?? body.phone,
      status: 'pending',
      idVerification: !needsIdVerification
        ? { status: 'verified', note: 'Merch-only order — no ID required' }
        : alreadyVerified
          ? { status: 'verified', note: 'Returning verified customer' }
          : { status: 'required' },
      createdAt: new Date().toISOString(),
    };

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    orders.unshift(newOrder); // newest first
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    if (body.referralCode) {
      await recordReferralConversion(body.referralCode, newOrder.id);
      await creditReferrerForConversion(body.referralCode);
    }

    const userId = await getSessionUserId();
    if (userId) {
      await awardPurchaseLoyalty(userId, subtotal);
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