'use client';

import { useEffect, useState } from 'react';
import SiteLayout from '@/app/components/SiteLayout';
import ReviewCard, { type ReviewCardData } from '@/app/components/ReviewCard';
import ReviewForm from '@/app/components/ReviewForm';
import { StarDisplay } from '@/app/components/StarRating';
import { products } from '@/lib/products';
import { useSiteContent } from '@/lib/useSiteContent';
import XLiveTimeline from '@/app/components/XLiveTimeline';
import type { PublicTdPost } from '@/lib/tdRewards';

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
  const [tdPosts, setTdPosts] = useState<PublicTdPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [r, td] = await Promise.all([
        fetch('/api/reviews'),
        fetch('/api/td-rewards/public?limit=16'),
      ]);
      if (!r.ok) throw new Error('Failed');
      const data = await r.json();
      setReviews(data.reviews || []);
      setStats(data.stats || null);
      if (td.ok) {
        const tdData = await td.json();
        setTdPosts(tdData.posts || []);
      }
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
              Live from{' '}
              <a
                href="https://x.com/KushWorld"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00ff9d] hover:underline"
              >
                @KushWorld
              </a>
              . Public posts that say <span className="text-white">td td gang</span> or{' '}
              <span className="text-white">#KushWorldTD</span> count as TDs — paste the link in Account for points.
            </p>

            {tdPosts.length > 0 && (
              <div className="mb-10">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Latest credited TDs</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {tdPosts.map((post) => (
                    <a
                      key={post.id}
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-zinc-900 border border-zinc-800 hover:border-[#00ff9d]/40 rounded-2xl p-4"
                    >
                      <p className="font-semibold text-[#00ff9d]">{post.handle}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {new Date(post.createdAt).toLocaleDateString()}
                        {post.pointsAwarded > 0 ? ` · +${post.pointsAwarded.toLocaleString()} pts` : ''}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

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

            <XLiveTimeline title="@KushWorld live" />
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-400">
              <p className="font-semibold text-white mb-2">How TDs get in</p>
              <p className="leading-relaxed">
                Post publicly, tag <span className="text-[#00ff9d]">@KushWorld</span>, and say{' '}
                <span className="text-white">td td gang</span>. Save the same X username on your profile, then paste
                the post URL under Account → TouchDown for 500 points.
              </p>
              <a
                href="https://x.com/search?q=%22td%20td%20gang%22%20%40KushWorld&src=typed_query&f=live"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-[#00ff9d] font-medium hover:underline"
              >
                Live X search for td td gang →
              </a>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}