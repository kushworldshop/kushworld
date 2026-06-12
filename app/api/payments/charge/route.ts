import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { chargeCard } from '@/lib/authorizeNet';
import { isCustomerVerified } from '@/lib/verification';

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
    const { customer, items, subtotal, opaqueData } = body;

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

    const orderId = `KW-${Date.now().toString().slice(-8)}`;
    const payment = await chargeCard(subtotal, opaqueData, customer, orderId);

    if (!payment.success) {
      return NextResponse.json(
        { success: false, error: payment.error || 'Payment failed' },
        { status: 402 }
      );
    }

    await ensureOrdersFile();
    const email = customer.email;
    const alreadyVerified = await isCustomerVerified(email);

    const newOrder = {
      id: orderId,
      customer,
      items,
      subtotal,
      paymentMethod: 'card',
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
      idVerification: alreadyVerified
        ? { status: 'verified', note: 'Returning verified customer' }
        : { status: 'required' },
      createdAt: new Date().toISOString(),
    };

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    orders.unshift(newOrder);
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    return NextResponse.json({
      success: true,
      orderId,
      transactionId: payment.transactionId,
      requiresIdUpload: !alreadyVerified,
    });
  } catch (error) {
    console.error('Payment charge error:', error);
    return NextResponse.json(
      { success: false, error: 'Payment processing failed. Please try again.' },
      { status: 500 }
    );
  }
}