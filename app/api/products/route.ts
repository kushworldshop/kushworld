import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/productCatalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await getProducts();
    return NextResponse.json(
      { success: true, products },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load products' }, { status: 500 });
  }
}