import { NextResponse } from 'next/server';
import { getAuthorizeNetConfig } from '@/lib/authorizeNet';

export async function GET() {
  const config = getAuthorizeNetConfig();

  return NextResponse.json({
    configured: config.isConfigured,
    apiLoginId: config.apiLoginId,
    clientKey: config.clientKey,
    acceptJsUrl: config.acceptJsUrl,
    environment: config.env,
  });
}