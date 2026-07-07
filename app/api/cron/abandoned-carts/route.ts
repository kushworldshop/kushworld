import { NextRequest, NextResponse } from 'next/server';
import { processAbandonedCarts } from '@/lib/abandonedCarts';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get('authorization') || '';
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = request.headers.get('x-cron-secret');
  return headerSecret === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';
    const limit = Number(request.nextUrl.searchParams.get('limit') || 50);
    const result = await processAbandonedCarts({ dryRun, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[cron/abandoned-carts]', error);
    return NextResponse.json({ success: false, error: 'Abandoned cart job failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}