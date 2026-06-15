import { NextRequest, NextResponse } from 'next/server';
import { addProductReaction, getReactionsForProduct } from '@/lib/product-reactions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }
  const reactions = await getReactionsForProduct(productId);
  return NextResponse.json({ reactions });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, emote } = body;
    if (!productId || !emote) {
      return NextResponse.json({ error: 'productId and emote required' }, { status: 400 });
    }
    const reactions = await addProductReaction(productId, emote);
    return NextResponse.json({ success: true, reactions });
  } catch {
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
  }
}
