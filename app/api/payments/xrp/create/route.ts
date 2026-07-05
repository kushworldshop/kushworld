import { NextRequest, NextResponse } from 'next/server';
import { buildCheckoutOrder } from '@/lib/checkoutOrderBuilder';
import { createOrderAccessToken } from '@/lib/orderAccessToken';
import { generateOrderId } from '@/lib/orderIds';
import { readOrders, writeOrders } from '@/lib/ordersStore';
import {
  deductInventoryForOrder,
  InventoryError,
  restoreInventoryForOrder,
} from '@/lib/inventory';
import { createXrpPaymentDetails, type XrpPaymentRecord } from '@/lib/xrpCheckout';

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
        paymentMethod: 'xrp',
      },
      orderId
    );

    const xrpPayment = await createXrpPaymentDetails(orderId, order.total);
    const xrpRecord: XrpPaymentRecord = {
      address: xrpPayment.address,
      amountXrp: xrpPayment.amountXrp,
      amountDrops: xrpPayment.amountDrops,
      amountUsd: xrpPayment.amountUsd,
      rateUsd: xrpPayment.rateUsd,
      destinationTag: xrpPayment.destinationTag,
      expiresAt: xrpPayment.expiresAt,
      createdAt: new Date().toISOString(),
    };

    const { promoMeta, needsIdVerification, alreadyVerified, ...orderData } = order;

    const newOrder = {
      ...orderData,
      paymentMethod: 'xrp',
      paymentStatus: 'awaiting_xrp',
      xrpPayment: xrpRecord,
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
        address: xrpPayment.address,
        amountXrp: xrpPayment.amountXrp,
        amountUsd: xrpPayment.amountUsd,
        rateUsd: xrpPayment.rateUsd,
        destinationTag: xrpPayment.destinationTag,
        expiresAt: xrpPayment.expiresAt,
        qrUrl: xrpPayment.qrUrl,
        xrpUri: xrpPayment.xrpUri,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create XRP payment';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}