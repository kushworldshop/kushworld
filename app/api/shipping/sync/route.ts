import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isAdminRequest } from '@/lib/adminAuth';
import {
  btcPostageCarrierToTrackingCarrier,
  getBtcPostageConfig,
  retrieveBtcPostageOrder,
  retrieveBtcPostagePurchase,
} from '@/lib/btcPostage';
import { normalizeTrackingCarrier } from '@/lib/orderShipping';
import {
  applyShippingEmailTimestamps,
  maybeSendShippingEmail,
} from '@/lib/orderShippingEmail';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const config = getBtcPostageConfig();
  if (!config.isConfigured) {
    return NextResponse.json({ success: false, error: 'BTC Postage is not configured' }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const targetOrderId = body.orderId as string | undefined;

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = JSON.parse(data) as any[];
    const updated: string[] = [];

    for (let index = 0; index < orders.length; index += 1) {
      const order = orders[index];
      const orderId = String(order.id || '');
      if (!orderId) continue;
      if (targetOrderId && orderId !== targetOrderId) continue;

      const btcPostageOrderId = String(order.btcPostageOrderId || '');
      if (!btcPostageOrderId) continue;

      const previousOrder = { ...order };
      let trackingNo = '';
      let carrier = '';

      try {
        const purchase = await retrieveBtcPostagePurchase(btcPostageOrderId);
        const label = purchase.items[0];
        trackingNo = label?.trackingNo || '';
        carrier = label?.carrier || '';
      } catch {
        const rows = await retrieveBtcPostageOrder(btcPostageOrderId);
        const row = rows[0];
        trackingNo = row?.trackingNo || '';
        carrier = row?.carrier || '';
      }

      if (!trackingNo) continue;

      const changed =
        order.trackingNumber !== trackingNo ||
        (carrier && order.btcPostageCarrier !== carrier);

      if (!changed && targetOrderId) {
        return NextResponse.json({
          success: true,
          updated: [],
          message: 'Tracking already up to date',
        });
      }

      if (!changed) continue;

      orders[index] = {
        ...order,
        trackingNumber: trackingNo,
        trackingCarrier: normalizeTrackingCarrier(btcPostageCarrierToTrackingCarrier(carrier)),
        btcPostageCarrier: carrier || order.btcPostageCarrier,
        status: order.status === 'delivered' ? 'delivered' : 'shipped',
        shippedAt: order.shippedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const emailResult = await maybeSendShippingEmail(previousOrder, orders[index]);
      if (emailResult.kind && emailResult.sent) {
        orders[index] = applyShippingEmailTimestamps(orders[index], emailResult.kind);
      }

      updated.push(orderId);
    }

    if (updated.length > 0) {
      await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
    }

    return NextResponse.json({
      success: true,
      updated,
      message:
        updated.length > 0
          ? `Synced tracking for ${updated.length} order(s)`
          : 'No orders needed tracking updates',
    });
  } catch (error) {
    console.error('BTC Postage sync error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to sync tracking' },
      { status: 502 }
    );
  }
}