import { NextRequest, NextResponse } from 'next/server';
import {
  checkBtcPaymentOnChain,
  getBtcMinConfirmations,
  isBtcPaymentExpired,
} from '@/lib/bitcoinCheckout';
import { fulfillPaidOrder } from '@/lib/orderFulfillment';
import { verifyOrderAccessToken } from '@/lib/orderAccessToken';
import { getOrderById, updateOrderById } from '@/lib/ordersStore';

interface StoredOrder {
  id: string;
  paymentStatus?: string;
  paymentMethod?: string;
  status?: string;
  fulfillmentPending?: boolean;
  btcPayment?: {
    address: string;
    amountSatoshis: number;
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
  if (!order || order.paymentMethod !== 'btc' || !order.btcPayment) {
    return NextResponse.json({ success: false, error: 'Bitcoin order not found' }, { status: 404 });
  }

  const orderEmail = order.customer?.email || order.email || '';
  if (!verifyOrderAccessToken(orderId, orderEmail, accessToken)) {
    return NextResponse.json({ success: false, error: 'Invalid order access' }, { status: 403 });
  }

  if (order.paymentStatus === 'paid') {
    return NextResponse.json({
      success: true,
      status: 'paid',
      txid: order.btcPayment.txid,
      confirmations: order.btcPayment.confirmations ?? 1,
    });
  }

  if (isBtcPaymentExpired(order.btcPayment.expiresAt)) {
    return NextResponse.json({
      success: true,
      status: 'expired',
      expiresAt: order.btcPayment.expiresAt,
    });
  }

  const chain = await checkBtcPaymentOnChain(
    order.btcPayment.address,
    order.btcPayment.amountSatoshis,
    order.btcPayment.createdAt
  );

  if (!chain.found) {
    return NextResponse.json({
      success: true,
      status: 'awaiting',
      expiresAt: order.btcPayment.expiresAt,
      expectedBtc: order.btcPayment.amountSatoshis / 100_000_000,
    });
  }

  const minConfirmations = getBtcMinConfirmations();
  if (chain.confirmations < minConfirmations) {
    return NextResponse.json({
      success: true,
      status: 'confirming',
      txid: chain.txid,
      confirmations: chain.confirmations,
      expiresAt: order.btcPayment.expiresAt,
    });
  }

  const updated = await updateOrderById<StoredOrder>(orderId, (current) => ({
    ...current,
    paymentStatus: 'paid',
    status: 'processing',
    transactionId: chain.txid,
    btcPayment: {
      ...current.btcPayment!,
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