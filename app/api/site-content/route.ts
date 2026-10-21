import { NextResponse } from 'next/server';
import { getSiteContent, toPublicSiteContent } from '@/lib/siteContent';

export async function GET() {
  const content = toPublicSiteContent(await getSiteContent());
  return NextResponse.json({ success: true, content });
}