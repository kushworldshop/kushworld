import { NextRequest, NextResponse } from 'next/server';
import {
  addReview,
  getAllReviews,
  getFeaturedAndRecent,
  getReviewStats,
  getReviewsForProduct,
  validateReviewInput,
} from '@/lib/reviews';
import { products, getProductSlug } from '@/lib/products';

function enrichReviews(reviews: Awaited<ReturnType<typeof getAllReviews>>) {
  return reviews.map((review) => {
    if (!review.productId) return { ...review, productName: null, productSlug: null };
    const product = products.find((p) => p.id === review.productId);
    return {
      ...review,
      productName: product?.name ?? null,
      productSlug: product ? getProductSlug(product) : null,
    };
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  const featured = searchParams.get('featured') === 'true';
  const limit = Number(searchParams.get('limit') || 0);
  const statsOnly = searchParams.get('stats') === 'true';

  if (productId) {
    const reviews = enrichReviews(await getReviewsForProduct(productId));
    if (statsOnly) {
      return NextResponse.json({ stats: getReviewStats(reviews) });
    }
    return NextResponse.json({ reviews, stats: getReviewStats(reviews) });
  }

  let reviews = featured
    ? enrichReviews(await getFeaturedAndRecent(limit || 6))
    : enrichReviews(await getAllReviews());

  if (limit > 0 && !featured) {
    reviews = reviews.slice(0, limit);
  }

  const stats = getReviewStats(enrichReviews(await getAllReviews()));

  if (statsOnly) {
    return NextResponse.json({ stats });
  }

  return NextResponse.json({ reviews, stats });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, author, rating, comment } = body;

    const validation = validateReviewInput(author, comment, Number(rating));
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (productId && !products.some((p) => p.id === productId)) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
    }

    const review = await addReview({
      productId: productId || null,
      author,
      rating: Number(rating),
      comment,
      source: 'customer',
    });

    const product = productId ? products.find((p) => p.id === productId) : null;

    return NextResponse.json({
      success: true,
      review: {
        ...review,
        productName: product?.name ?? null,
        productSlug: product ? getProductSlug(product) : null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}