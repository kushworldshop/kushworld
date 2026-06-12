import { NextResponse } from 'next/server';
import { getBtcPaymentExpiryMinutes, getBtcWalletAddress } from '@/lib/bitcoinCheckout';

export async function GET() {
  const address = getBtcWalletAddress();
  return NextResponse.json({
    enabled: Boolean(address),
    address,
    expiryMinutes: getBtcPaymentExpiryMinutes(),
    currency: 'BTC',
  });
}