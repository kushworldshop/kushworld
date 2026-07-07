import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import {
  getAbandonedCartSummary,
  processAbandonedCarts,
  pruneStaleCarts,
} from '@/lib/abandonedCarts';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await getAbandonedCartSummary();
    return NextResponse.json({ success: true, ...summary });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load abandoned cart summary' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'send';

    if (action === 'cleanup') {
      const pruned = await pruneStaleCarts();
      const summary = await getAbandonedCartSummary();
      return NextResponse.json({ success: true, pruned, ...summary });
    }

    const dryRun = Boolean(body.dryRun);
    const limit = Number(body.limit || 50);
    const result = await processAbandonedCarts({ dryRun, limit });
    const summary = await getAbandonedCartSummary();
    return NextResponse.json({ success: true, ...result, ...summary });
  } catch (error) {
    console.error('[admin/abandoned-carts]', error);
    return NextResponse.json({ success: false, error: 'Abandoned cart action failed' }, { status: 500 });
  }
}