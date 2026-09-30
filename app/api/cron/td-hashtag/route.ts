import { NextRequest, NextResponse } from 'next/server';
import { scanKushWorldTdHashtag } from '@/lib/tdRewards';

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
    const result = await scanKushWorldTdHashtag();
    return NextResponse.json({ success: !result.error, ...result });
  } catch (error) {
    console.error('[cron/td-hashtag]', error);
    return NextResponse.json({ success: false, error: 'TD hashtag scan failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
