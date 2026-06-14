'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReviewCard, { type ReviewCardData } from './ReviewCard';
import { StarDisplay } from './StarRating';
import { useSiteContent } from '@/lib/useSiteContent';

interface ReviewStats {
  count: number;
  average: number;
}

export default function ReviewsSection() {
  const { content } = useSiteContent();
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const r = await fetch('/api/reviews?featured=true&limit=3');
      if (!r.ok) throw new Error('Failed');
      const data = await r.json();
      setReviews(data.reviews || []);
      setStats(data.stats || { count: 0, average: 0 });
    } catch {
      setLoadError('Could not load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  return (
    <section id="reviews" className="py-24 bg-black border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="text-[#00ff9d] text-sm font-medium uppercase tracking-widest mb-3">
              {content.reviewsSection.eyebrow}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{content.reviewsSection.title}</h2>
            {loading ? (
              <p className="text-zinc-400 text-sm">Loading reviews…</p>
            ) : stats.count > 0 && (
              <div className="flex items-center gap-3">
                <StarDisplay rating={stats.average} />
                <p className="text-zinc-400">
                  {stats.average.toFixed(1)} average from {stats.count} review{stats.count !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/reviews"
              className="px-8 py-4 bg-[#00ff9d] text-black rounded-2xl font-bold text-center"
            >
              {content.reviewsSection.ctaLabel}
            </Link>
            <a
              href={content.social.twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-zinc-700 rounded-2xl font-bold text-center hover:border-[#00ff9d] transition"
            >
              {content.reviewsSection.socialCtaLabel}
            </a>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-[#00ff9d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">Loading reviews…</p>
          </div>
        ) : loadError ? (
          <p className="text-center text-red-400 text-sm py-8">{loadError} <button onClick={loadReviews} className="underline text-[#00ff9d]">Retry</button></p>
        ) : reviews.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-zinc-900 rounded-3xl border border-zinc-800">
            <p className="text-zinc-400 mb-6">Be the first to leave a review.</p>
            <Link href="/reviews" className="text-[#00ff9d] font-semibold hover:underline">
              Write a short review →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}