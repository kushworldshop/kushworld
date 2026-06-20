import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import {
  getBtcPostageConfig,
  getBtcPostageRates,
  orderToBtcPostageAddress,
  type BtcPostageDimensions,
  type BtcPostagePackageType,
} from '@/lib/btcPostage';
import { resolveShipFromForLabel } from '@/lib/grokShippingPrep';
import { getDefaultPackageProfile } from '@/lib/shippingPackage';
import { isShipFromComplete, normalizeShipFromInput, resolveShipFrom } from '@/lib/shipFromAddress';
import type { OrderForShippingValidation } from '@/lib/shippingOrderValidation';
import fs from 'fs/promises';
import path from 'path';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

type StoredOrder = OrderForShippingValidation;

async function loadOrder(orderId: string): Promise<StoredOrder | undefined> {
  const data = await fs.readFile(ORDERS_FILE, 'utf8');
  const orders = JSON.parse(data) as StoredOrder[];
  return orders.find((order) => order.id === orderId);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const isAdmin = isAdminRequest(request);
  const orderId = body.orderId as string | undefined;

  if (orderId && !isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const config = getBtcPostageConfig();
  if (!config.isConfigured) {
    return NextResponse.json({ success: false, error: 'BTC Postage is not configured' }, { status: 503 });
  }

  try {
    let toAddress = body.toAddress;
    let itemCount = Number(body.itemCount || 1);
    let order: StoredOrder | undefined;

    if (orderId) {
      order = await loadOrder(orderId);
      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      toAddress = orderToBtcPostageAddress(order);
      itemCount = Array.isArray(order.items) ? order.items.length : 1;
    }

    if (!toAddress?.street || !toAddress?.city || !toAddress?.state || !toAddress?.zip) {
      return NextResponse.json(
        { success: false, error: 'Complete destination address is required' },
        { status: 400 }
      );
    }

    let fromAddress = normalizeShipFromInput(body.fromAddress);
    let shipFromMeta = { id: 'manual', label: 'Manual', reason: 'Provided in request' };

    if (!isShipFromComplete(fromAddress)) {
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Ship-from address required (or provide orderId for Grok auto-select)' },
          { status: 400 }
        );
      }
      const resolved = await resolveShipFromForLabel(order, body.fromAddress);
      if ('error' in resolved) {
        return NextResponse.json({ success: false, error: resolved.error }, { status: 400 });
      }
      fromAddress = resolved.address;
      shipFromMeta = {
        id: resolved.id,
        label: resolved.label,
        reason: resolved.reason,
      };
    } else {
      const fallback = resolveShipFrom(body.fromAddress);
      fromAddress = fallback.address;
    }

    const defaults = getDefaultPackageProfile(itemCount);
    const packageType = (body.packageType as BtcPostagePackageType | undefined) || defaults.packageType;
    const dimensions: BtcPostageDimensions = {
      ...defaults.dimensions,
      ...(body.dimensions || {}),
    };

    const rates = await getBtcPostageRates({
      from: fromAddress,
      to: {
        name: toAddress.name || 'Customer',
        street: toAddress.street,
        street2: toAddress.street2,
        city: toAddress.city,
        state: toAddress.state,
        zip: toAddress.zip,
        country: toAddress.country || 'US',
        phone: toAddress.phone || '',
      },
      packageType,
      dimensions,
      service: body.service,
    });

    return NextResponse.json({
      success: true,
      rates: rates.sort((a, b) => a.rate - b.rate),
      packageType,
      dimensions,
      shipFrom: fromAddress,
      shipFromId: shipFromMeta.id,
      shipFromLabel: shipFromMeta.label,
      shipFromReason: shipFromMeta.reason,
    });
  } catch (error) {
    console.error('BTC Postage rates error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch rates' },
      { status: 502 }
    );
  }
}