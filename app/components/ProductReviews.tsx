'use client';

import { useEffect, useState } from 'react';
import { useSiteContent } from '@/lib/useSiteContent';
import ReviewCard, { type ReviewCardData } from './ReviewCard';
import ReviewForm from './ReviewForm';
import { StarDisplay } from './StarRating';

export default function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const { content } = useSiteContent();
  const { features } = content;
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [avg, setAvg] = useState(0);

  const loadReviews = () => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews || []);
        setAvg(data.stats?.average || 0);
      });
  };

  useEffect(() => { loadReviews(); }, [productId]);

  return (
    <section className="mt-20 border-t border-zinc-800 pt-16">
      <h2 className="text-3xl font-bold mb-2">Customer Reviews</h2>
      <div className="flex items-center gap-3 mb-8">
        {reviews.length > 0 ? (
          features.starRatings.enabled ? (
            <>
              <StarDisplay rating={avg} />
              <p className="text-zinc-400">
                {avg.toFixed(1)} average · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <p className="text-zinc-400">
              {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </p>
          )
        ) : (
          <p className="text-zinc-400">No reviews yet — be the first!</p>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      <div className="max-w-lg">
        <ReviewForm
          productId={productId}
          productName={productName}
          onSuccess={loadReviews}
          requirePurchase={features.customerReviews.requirePurchase}
          rewardPoints={features.customerReviews.rewardPoints}
        />
      </div>
    </section>
  );
}