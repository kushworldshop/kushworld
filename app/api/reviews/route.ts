import { NextRequest, NextResponse } from 'next/server';
import { addReview, getReviewsForProduct } from '@/lib/reviews';

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('productId');
  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }
  const reviews = await getReviewsForProduct(productId);
  return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
  try {
    const { productId, author, rating, comment } = await request.json();
    if (!productId || !author || !comment || !rating) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const review = await addReview({ productId, author, rating: Number(rating), comment });
    return NextResponse.json({ success: true, review });
  } catch {
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}