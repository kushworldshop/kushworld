import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/coupons';

export async function POST(request: NextRequest) {
  try {
    const { code, subtotal, isFirstOrder } = await request.json();
    if (!code || subtotal == null) {
      return NextResponse.json({ valid: false, error: 'Code and subtotal required' }, { status: 400 });
    }
    const result = await validateCoupon(code, subtotal, !!isFirstOrder);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ valid: false, error: 'Validation failed' }, { status: 500 });
  }
}