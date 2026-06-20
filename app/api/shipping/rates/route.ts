import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import {
  getBtcPostageConfig,
  getBtcPostageRates,
  orderToBtcPostageAddress,
  type BtcPostageDimensions,
  type BtcPostagePackageType,
} from '@/lib/btcPostage';
import { getDefaultPackageProfile } from '@/lib/shippingPackage';
import fs from 'fs/promises';
import path from 'path';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

type StoredOrder = {
  id: string;
  items?: unknown[];
  customer?: {
    name?: string;
    address?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
  };
  name?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
};

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

    if (orderId) {
      const order = await loadOrder(orderId);
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

    const defaults = getDefaultPackageProfile(itemCount);
    const packageType = (body.packageType as BtcPostagePackageType | undefined) || defaults.packageType;
    const dimensions: BtcPostageDimensions = {
      ...defaults.dimensions,
      ...(body.dimensions || {}),
    };

    const rates = await getBtcPostageRates({
      from: config.shipFrom,
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
    });
  } catch (error) {
    console.error('BTC Postage rates error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch rates' },
      { status: 502 }
    );
  }
}