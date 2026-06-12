import { NextResponse } from 'next/server';
import { getSiteContent } from '@/lib/siteContent';

export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json({ success: true, content });
}