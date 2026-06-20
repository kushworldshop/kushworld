import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isAdminRequest } from '@/lib/adminAuth';
import { prepareGrokShippingLabel } from '@/lib/grokShippingPrep';
import { isXaiConfigured } from '@/lib/xai';
import type { OrderForShippingValidation } from '@/lib/shippingOrderValidation';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isXaiConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Grok is not configured. Add XAI_API_KEY on the server.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const orderId = String(body.orderId || '');
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
    }

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data) as OrderForShippingValidation[];
    const order = orders.find((entry) => entry.id === orderId);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const result = await prepareGrokShippingLabel(order);
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      prep: result.prep,
    });
  } catch (error) {
    console.error('Grok shipping prepare error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to prepare shipping' },
      { status: 500 }
    );
  }
}