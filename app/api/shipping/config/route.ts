import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { getBtcPostageConfig, getBtcPostageCredits } from '@/lib/btcPostage';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const config = getBtcPostageConfig();

  if (!config.isConfigured) {
    return NextResponse.json({
      success: true,
      configured: false,
      missing: {
        apiKey: !config.apiKey,
        apiSecret: !config.apiSecret,
        shipFrom: !config.shipFrom.street || !config.shipFrom.city || !config.shipFrom.state || !config.shipFrom.zip,
      },
      shipFrom: {
        name: config.shipFrom.name,
        city: config.shipFrom.city,
        state: config.shipFrom.state,
        zip: config.shipFrom.zip,
      },
      defaultPackageType: config.defaultPackageType,
      testMode: config.testMode,
    });
  }

  try {
    const credits = await getBtcPostageCredits();
    return NextResponse.json({
      success: true,
      configured: true,
      credits: credits.credits,
      shipFrom: {
        name: config.shipFrom.name,
        city: config.shipFrom.city,
        state: config.shipFrom.state,
        zip: config.shipFrom.zip,
      },
      defaultPackageType: config.defaultPackageType,
      testMode: config.testMode,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      configured: true,
      error: error instanceof Error ? error.message : 'Failed to load BTC Postage account',
    }, { status: 502 });
  }
}