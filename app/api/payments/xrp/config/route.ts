import { NextResponse } from 'next/server';
import { getXrpPaymentExpiryMinutes, getXrpWalletAddress } from '@/lib/xrpCheckout';

export async function GET() {
  const address = getXrpWalletAddress();
  return NextResponse.json({
    enabled: Boolean(address),
    address,
    expiryMinutes: getXrpPaymentExpiryMinutes(),
    currency: 'XRP',
  });
}