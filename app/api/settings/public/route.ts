import { NextResponse } from 'next/server';
import { getPublicPromoTerms } from '@/lib/promoCodes';

export async function GET() {
  const terms = await getPublicPromoTerms();
  return NextResponse.json({ success: true, ...terms });
}