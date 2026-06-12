import { NextRequest, NextResponse } from 'next/server';
import { isCustomerVerified } from '@/lib/verification';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
  }

  const verified = await isCustomerVerified(email);
  return NextResponse.json({
    success: true,
    verified,
    requiresUpload: !verified,
  });
}