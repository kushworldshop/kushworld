import { NextResponse } from 'next/server';
import { fetchBtcUsdRate, getBtcWalletSettings } from '@/lib/bitcoinCheckout';
import { getSiteContent } from '@/lib/siteContent';

export async function GET() {
  const [settings, content] = await Promise.all([getBtcWalletSettings(), getSiteContent()]);
  let rateUsd: number | null = null;
  try {
    rateUsd = await fetchBtcUsdRate();
  } catch {
    rateUsd = null;
  }

  return NextResponse.json({
    enabled: Boolean(settings.address) && content.features.paymentBitcoin.enabled,
    configured: Boolean(settings.address),
    btcOnly: content.features.checkoutBtcOnly.enabled,
    expiryMinutes: settings.expiryMinutes,
    rateUsd,
    currency: 'BTC',
  });
}
