import { NextRequest, NextResponse } from 'next/server';
import {
  checkXrpPaymentOnChain,
  getXrpMinConfirmations,
  isXrpPaymentExpired,
} from '@/lib/xrpCheckout';
import { fulfillPaidOrder } from '@/lib/orderFulfillment';
import { verifyOrderAccessToken } from '@/lib/orderAccessToken';
import { getOrderById, updateOrderById } from '@/lib/ordersStore';

interface StoredOrder {
  id: string;
  paymentStatus?: string;
  paymentMethod?: string;
  status?: string;
  fulfillmentPending?: boolean;
  xrpPayment?: {
    address: string;
    amountDrops: number;
    destinationTag: number;
    createdAt: string;
    expiresAt: string;
    txid?: string;
    confirmations?: number;
    paidAt?: string;
  };
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId');
  const accessToken = request.nextUrl.searchParams.get('orderAccessToken');
  if (!orderId || !accessToken) {
    return NextResponse.json({ success: false, error: 'Order verification required' }, { status: 400 });
  }

  const order = await getOrderById<StoredOrder & { email?: string; customer?: { email?: string } }>(
    orderId
  );
  if (!order || order.paymentMethod !== 'xrp' || !order.xrpPayment) {
    return NextResponse.json({ success: false, error: 'XRP order not found' }, { status: 404 });
  }

  const orderEmail = order.customer?.email || order.email || '';
  if (!verifyOrderAccessToken(orderId, orderEmail, accessToken)) {
    return NextResponse.json({ success: false, error: 'Invalid order access' }, { status: 403 });
  }

  if (order.paymentStatus === 'paid') {
    return NextResponse.json({
      success: true,
      status: 'paid',
      txid: order.xrpPayment.txid,
      confirmations: order.xrpPayment.confirmations ?? 1,
    });
  }

  if (isXrpPaymentExpired(order.xrpPayment.expiresAt)) {
    return NextResponse.json({
      success: true,
      status: 'expired',
      expiresAt: order.xrpPayment.expiresAt,
    });
  }

  const chain = await checkXrpPaymentOnChain(
    order.xrpPayment.address,
    order.xrpPayment.amountDrops,
    order.xrpPayment.destinationTag,
    order.xrpPayment.createdAt
  );

  if (!chain.found) {
    return NextResponse.json({
      success: true,
      status: 'awaiting',
      expiresAt: order.xrpPayment.expiresAt,
      expectedXrp: order.xrpPayment.amountDrops / 1_000_000,
      destinationTag: order.xrpPayment.destinationTag,
    });
  }

  const minConfirmations = getXrpMinConfirmations();
  if (chain.confirmations < minConfirmations) {
    return NextResponse.json({
      success: true,
      status: 'confirming',
      txid: chain.txid,
      confirmations: chain.confirmations,
      expiresAt: order.xrpPayment.expiresAt,
    });
  }

  const updated = await updateOrderById<StoredOrder>(orderId, (current) => ({
    ...current,
    paymentStatus: 'paid',
    status: 'processing',
    transactionId: chain.txid,
    xrpPayment: {
      ...current.xrpPayment!,
      txid: chain.txid,
      confirmations: chain.confirmations,
      paidAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  }));

  if (updated?.fulfillmentPending) {
    await fulfillPaidOrder(updated as StoredOrder);
    await updateOrderById(orderId, (current) => ({
      ...current,
      fulfillmentPending: false,
    }));
  }

  return NextResponse.json({
    success: true,
    status: 'paid',
    txid: chain.txid,
    confirmations: chain.confirmations,
  });
}