import { NextRequest, NextResponse } from 'next/server';
import { isEligibleForFreeEighth } from '@/lib/firstOrderBonusServer';
import { orderRequiresIdVerification } from '@/lib/products';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')?.trim();
  const phone = request.nextUrl.searchParams.get('phone')?.trim();
  const hasHempItems = request.nextUrl.searchParams.get('hasHempItems') === 'true';

  if (!email) {
    return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
  }

  const eligible = await isEligibleForFreeEighth(email, hasHempItems, phone || undefined);

  return NextResponse.json({
    success: true,
    eligible,
    requiresHempItems: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
    }

    const hasHempItems = orderRequiresIdVerification(items);
    const eligible = await isEligibleForFreeEighth(email, hasHempItems, phone || undefined);

    return NextResponse.json({ success: true, eligible });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}