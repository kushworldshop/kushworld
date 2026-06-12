'use client';

import { useEffect, useState } from 'react';
import SiteLayout from '@/app/components/SiteLayout';
import ReviewCard, { type ReviewCardData } from '@/app/components/ReviewCard';
import ReviewForm from '@/app/components/ReviewForm';
import { StarDisplay } from '@/app/components/StarRating';
import { products } from '@/lib/products';

interface ReviewStats {
  count: number;
  average: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);

  const loadReviews = () => {
    fetch('/api/reviews')
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews || []);
        setStats(data.stats || null);
      });
  };

  useEffect(() => { loadReviews(); }, []);

  const productOptions = products.map((p) => ({ id: p.id, name: p.name }));

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-[1fr_380px] gap-12">
          <div>
            <p className="text-[#00ff9d] text-sm font-medium uppercase tracking-widest mb-3">
              Customer Reviews
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Real Reviews from Real Customers</h1>
            <p className="text-zinc-400 mb-8 max-w-2xl leading-relaxed">
              See what shoppers say about Kush World — and leave your own short review after your order.
              We also highlight feedback from our{' '}
              <a
                href="https://x.com/KushWorld"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00ff9d] hover:underline"
              >
                @KushWorld
              </a>{' '}
              community on X.
            </p>

            {stats && stats.count > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10 flex flex-wrap items-center gap-8">
                <div>
                  <p className="text-5xl font-bold text-[#00ff9d]">{stats.average.toFixed(1)}</p>
                  <StarDisplay rating={stats.average} />
                  <p className="text-sm text-zinc-500 mt-2">{stats.count} total reviews</p>
                </div>
                <div className="flex-1 min-w-[200px] space-y-2">
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const count = stats.breakdown[star];
                    const pct = stats.count ? Math.round((count / stats.count) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-sm">
                        <span className="w-8 text-zinc-400">{star}★</span>
                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#00ff9d] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-zinc-500 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {reviews.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-900 rounded-3xl border border-zinc-800">
                <p className="text-zinc-400 text-lg">No reviews yet. Yours could be first.</p>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-28 h-fit space-y-6">
            <ReviewForm products={productOptions} onSuccess={loadReviews} />

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-400">
              <p className="font-semibold text-white mb-2">Have a review on X?</p>
              <p className="mb-4 leading-relaxed">
                Tag <span className="text-[#00ff9d]">@KushWorld</span> or DM us with your order feedback
                — we feature the best community posts right here on the site.
              </p>
              <a
                href="https://x.com/KushWorld"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[#00ff9d] font-medium hover:underline"
              >
                Visit @KushWorld on X →
              </a>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}