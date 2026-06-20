import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isAdminRequest } from '@/lib/adminAuth';
import {
  btcPostageCarrierToTrackingCarrier,
  getBtcPostageConfig,
  getBtcPostageLabelUrl,
  orderToBtcPostageAddress,
  purchaseBtcPostageLabel,
  type BtcPostageDimensions,
  type BtcPostagePackageType,
} from '@/lib/btcPostage';
import { getDefaultPackageProfile } from '@/lib/shippingPackage';
import { verifyGrokShippingPurchase } from '@/lib/grokShippingPrep';
import { normalizeTrackingCarrier } from '@/lib/orderShipping';
import type { OrderForShippingValidation } from '@/lib/shippingOrderValidation';
import { resolveShipFrom } from '@/lib/shipFromAddress';
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
    const body = await request.json();
    const {
      orderId,
      service,
      packageType: packageTypeInput,
      dimensions: dimensionsInput,
      fromAddress,
      testMode,
      manualApproved,
      useGrokVerify = false,
    } = body;

    if (!manualApproved) {
      return NextResponse.json(
        {
          success: false,
          error: 'Manual approval is required before purchasing a label',
        },
        { status: 400 }
      );
    }

    if (!orderId || !service) {
      return NextResponse.json(
        { success: false, error: 'orderId and service are required' },
        { status: 400 }
      );
    }

    const shipFrom = resolveShipFrom(fromAddress);
    if (!shipFrom.complete) {
      return NextResponse.json(
        { success: false, error: 'Complete ship-from address is required' },
        { status: 400 }
      );
    }

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    const index = orders.findIndex((order: { id: string }) => order.id === orderId);

    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const order = orders[index];
    const toAddress = orderToBtcPostageAddress(order);
    if (!toAddress.street || !toAddress.city || !toAddress.state || !toAddress.zip) {
      return NextResponse.json(
        { success: false, error: 'Order is missing a complete shipping address' },
        { status: 400 }
      );
    }

    const defaults = getDefaultPackageProfile(Array.isArray(order.items) ? order.items.length : 1);
    const packageType = (packageTypeInput as BtcPostagePackageType | undefined) || defaults.packageType;
    const dimensions: BtcPostageDimensions = {
      ...defaults.dimensions,
      ...(dimensionsInput || {}),
    };

    if (useGrokVerify) {
      const verification = await verifyGrokShippingPurchase({
        order: order as OrderForShippingValidation,
        service,
        packageType,
        dimensions,
        fromAddress: shipFrom.address,
      });

      if (!verification.approved) {
        return NextResponse.json(
          {
            success: false,
            error: verification.reason,
            verification,
          },
          { status: 400 }
        );
      }
    }

    const purchase = await purchaseBtcPostageLabel({
      from: shipFrom.address,
      to: toAddress,
      packageType,
      dimensions,
      service,
      testMode: testMode ?? config.testMode,
    });

    const label = purchase.items[0];
    if (!label?.trackingNo) {
      return NextResponse.json(
        { success: false, error: 'Label purchased but no tracking number was returned' },
        { status: 502 }
      );
    }

    const previousOrder = { ...order };
    const trackingCarrier = normalizeTrackingCarrier(btcPostageCarrierToTrackingCarrier(label.carrier));
    const labelUrl = getBtcPostageLabelUrl(label.filename);

    orders[index] = {
      ...order,
      status: 'shipped',
      shippedAt: order.shippedAt || new Date().toISOString(),
      trackingNumber: label.trackingNo,
      trackingCarrier,
      btcPostageOrderId: purchase.orderId,
      btcPostageShipmentId: label.shipmentId,
      btcPostageLabelUrl: labelUrl || undefined,
      btcPostageLabelFilename: label.filename || undefined,
      btcPostagePostageCost: Number(label.price || 0) || undefined,
      btcPostageService: label.service,
      btcPostageCarrier: label.carrier,
      btcPostageShipFrom: shipFrom.address,
      btcPostagePurchasedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let shippingEmailSent = false;
    let shippingEmailError: string | undefined;
    const emailResult = await maybeSendShippingEmail(previousOrder, orders[index]);
    if (emailResult.kind) {
      if (emailResult.sent) {
        orders[index] = applyShippingEmailTimestamps(orders[index], emailResult.kind);
        shippingEmailSent = true;
      } else {
        shippingEmailError = emailResult.error;
      }
    }

    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    return NextResponse.json({
      success: true,
      order: orders[index],
      purchase,
      labelUrl,
      shippingEmailSent,
      shippingEmailError,
    });
  } catch (error) {
    console.error('BTC Postage label purchase error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to purchase label' },
      { status: 502 }
    );
  }
}