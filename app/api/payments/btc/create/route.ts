import { NextRequest, NextResponse } from 'next/server';
import { createBtcPaymentDetails, type BtcPaymentRecord } from '@/lib/bitcoinCheckout';
import { buildCheckoutOrder } from '@/lib/checkoutOrderBuilder';
import { getSessionUserId } from '@/lib/auth';
import { createOrderAccessToken } from '@/lib/orderAccessToken';
import { generateOrderId } from '@/lib/orderIds';
import { readOrders, writeOrders } from '@/lib/ordersStore';
import {
  deductInventoryForOrder,
  InventoryError,
  restoreInventoryForOrder,
} from '@/lib/inventory';

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

    const orderId = generateOrderId();

    try {
      await deductInventoryForOrder(body.items);
    } catch (err) {
      if (err instanceof InventoryError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 400 });
      }
      throw err;
    }

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
      inventoryDeducted: true,
      inventoryRestored: false,
      updatedAt: new Date().toISOString(),
    };

    try {
      const orders = await readOrders();
      orders.unshift(newOrder);
      await writeOrders(orders);
    } catch (saveError) {
      await restoreInventoryForOrder(body.items);
      throw saveError;
    }

    const orderEmail = customer.email || (orderData.email as string | undefined);

    return NextResponse.json({
      success: true,
      orderId,
      orderAccessToken: orderEmail ? createOrderAccessToken(orderId, orderEmail) : undefined,
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