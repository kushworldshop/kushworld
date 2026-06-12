import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { isFeatureEnabled } from '@/lib/featureTypes';
import {
  customerHasAnyPurchase,
  customerHasPurchasedProduct,
} from '@/lib/purchaseVerification';
import {
  addReview,
  getAllReviews,
  getFeaturedAndRecent,
  getReviewStats,
  getReviewsForProduct,
  validateReviewInput,
} from '@/lib/reviews';
import { getSiteContent } from '@/lib/siteContent';
import { products, getProductSlug } from '@/lib/products';
import { addLoyaltyPoints, getUserById } from '@/lib/users';

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
    const content = await getSiteContent();
    const features = content.features;

    if (!isFeatureEnabled(features, 'customerReviews')) {
      return NextResponse.json({ error: 'Customer reviews are currently disabled' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, author, rating, comment } = body;

    const validation = validateReviewInput(author, comment, Number(rating));
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (productId && !products.some((p) => p.id === productId)) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
    }

    const userId = await getSessionUserId();
    const user = userId ? await getUserById(userId) : null;

    if (features.customerReviews.requirePurchase) {
      if (!user?.email) {
        return NextResponse.json(
          { error: 'Sign in and complete a purchase before leaving a review' },
          { status: 403 }
        );
      }

      const hasPurchase = productId
        ? await customerHasPurchasedProduct(user.email, productId)
        : await customerHasAnyPurchase(user.email);

      if (!hasPurchase) {
        return NextResponse.json(
          {
            error: productId
              ? 'You need to purchase this product before reviewing it'
              : 'You need a completed order before leaving a review',
          },
          { status: 403 }
        );
      }
    }

    const review = await addReview({
      productId: productId || null,
      author,
      rating: Number(rating),
      comment,
      source: 'customer',
    });

    let pointsAwarded = 0;
    if (userId && features.customerReviews.rewardPoints > 0) {
      pointsAwarded = features.customerReviews.rewardPoints;
      await addLoyaltyPoints(userId, pointsAwarded);
    }

    const product = productId ? products.find((p) => p.id === productId) : null;

    return NextResponse.json({
      success: true,
      pointsAwarded,
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