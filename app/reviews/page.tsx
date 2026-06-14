'use client';

import { useEffect, useState } from 'react';
import SiteLayout from '@/app/components/SiteLayout';
import ReviewCard, { type ReviewCardData } from '@/app/components/ReviewCard';
import ReviewForm from '@/app/components/ReviewForm';
import { StarDisplay } from '@/app/components/StarRating';
import { products } from '@/lib/products';
import { useSiteContent } from '@/lib/useSiteContent';

interface ReviewStats {
  count: number;
  average: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

export default function ReviewsPage() {
  const { content } = useSiteContent();
  const { features } = content;
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const r = await fetch('/api/reviews');
      if (!r.ok) throw new Error('Failed');
      const data = await r.json();
      setReviews(data.reviews || []);
      setStats(data.stats || null);
    } catch {
      setLoadError('Could not load reviews right now. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); }, []);

  const productOptions = products.map((p) => ({ id: p.id, name: p.name }));

  if (!features.customerReviews.enabled) {
    return (
      <SiteLayout>
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Reviews Unavailable</h1>
          <p className="text-zinc-400">Customer reviews are turned off right now. Check back soon.</p>
        </div>
      </SiteLayout>
    );
  }

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
              Real touchdown posts from customers on X — plus reviews left right here after orders.
              We feature verified posts below from a trusted source on{' '}
              <a
                href="https://x.com/KushWorld"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00ff9d] hover:underline"
              >
                @KushWorld
              </a>
              .
            </p>

            {loading ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-4 border-[#00ff9d] border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-400">Loading review stats…</p>
                </div>
              </div>
            ) : stats && stats.count > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-10 flex flex-wrap items-center gap-8">
                <div>
                  {features.starRatings.enabled && (
                    <>
                      <p className="text-5xl font-bold text-[#00ff9d]">{stats.average.toFixed(1)}</p>
                      <StarDisplay rating={stats.average} />
                    </>
                  )}
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

            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-[#00ff9d] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-zinc-400">Loading reviews…</p>
              </div>
            ) : loadError ? (
              <div className="text-center py-12 bg-zinc-900 rounded-3xl border border-zinc-800">
                <p className="text-red-400">{loadError}</p>
                <button onClick={loadReviews} className="mt-4 text-[#00ff9d] hover:underline">Try again</button>
              </div>
            ) : reviews.length > 0 ? (
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
            <ReviewForm
              products={productOptions}
              onSuccess={loadReviews}
              requirePurchase={features.customerReviews.requirePurchase}
              rewardPoints={features.customerReviews.rewardPoints}
            />

            <div className="bg-zinc-900 border border-[#00ff9d]/20 rounded-2xl p-6 text-sm text-zinc-400">
              <p className="font-semibold text-white mb-2">Verified trusted source</p>
              <p className="mb-4 leading-relaxed">
                Search <span className="text-[#00ff9d]">@KushWorld</span> on X for touchdown posts,
                order pics, and customer shoutouts. Tag us on your next TD to get featured here.
              </p>
              <a
                href="https://x.com/search?q=%40KushWorld%20touchdown&src=typed_query&f=live"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[#00ff9d] font-medium hover:underline"
              >
                Browse @KushWorld touchdowns on X →
              </a>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}