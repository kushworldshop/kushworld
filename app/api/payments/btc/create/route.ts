import { NextRequest, NextResponse } from 'next/server';
import { createBtcPaymentDetails, type BtcPaymentRecord } from '@/lib/bitcoinCheckout';
import { buildCheckoutOrder } from '@/lib/checkoutOrderBuilder';
import { readOrders, writeOrders } from '@/lib/ordersStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer = body.customer ?? {};

    if (!customer.name || !customer.email || !customer.address) {
      return NextResponse.json(
        { success: false, error: 'Complete shipping information is required' },
        { status: 400 }
      );
    }

    if (!body.items?.length || !body.subtotal || body.subtotal <= 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty or total is invalid' }, { status: 400 });
    }

    const orderId = `KW-${Date.now().toString().slice(-8)}`;
    const order = await buildCheckoutOrder(
      {
        ...body,
        paymentMethod: 'btc',
      },
      orderId
    );

    const btcPayment = await createBtcPaymentDetails(orderId, order.total);
    const btcRecord: BtcPaymentRecord = {
      address: btcPayment.address,
      amountBtc: btcPayment.amountBtc,
      amountSatoshis: btcPayment.amountSatoshis,
      amountUsd: btcPayment.amountUsd,
      rateUsd: btcPayment.rateUsd,
      expiresAt: btcPayment.expiresAt,
      createdAt: new Date().toISOString(),
    };

    const { promoMeta, needsIdVerification, alreadyVerified, ...orderData } = order;

    const newOrder = {
      ...orderData,
      paymentMethod: 'btc',
      paymentStatus: 'awaiting_btc',
      btcPayment: btcRecord,
      fulfillmentPending: true,
      updatedAt: new Date().toISOString(),
    };

    const orders = await readOrders();
    orders.unshift(newOrder);
    await writeOrders(orders);

    return NextResponse.json({
      success: true,
      orderId,
      requiresIdUpload: needsIdVerification && !alreadyVerified,
      payment: {
        address: btcPayment.address,
        amountBtc: btcPayment.amountBtc,
        amountUsd: btcPayment.amountUsd,
        rateUsd: btcPayment.rateUsd,
        expiresAt: btcPayment.expiresAt,
        qrUrl: btcPayment.qrUrl,
        bitcoinUri: btcPayment.bitcoinUri,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Bitcoin payment';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}