'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReviewCard, { type ReviewCardData } from './ReviewCard';
import { StarDisplay } from './StarRating';

interface ReviewStats {
  count: number;
  average: number;
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ count: 0, average: 0 });

  useEffect(() => {
    fetch('/api/reviews?featured=true&limit=9')
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews || []);
        setStats(data.stats || { count: 0, average: 0 });
      });
  }, []);

  return (
    <section id="reviews" className="py-24 bg-black border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <p className="text-[#00ff9d] text-sm font-medium uppercase tracking-widest mb-3">
              Verified on X · Hundreds More
            </p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What People Are Saying</h2>
            {stats.count > 0 && (
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
              See All Reviews
            </Link>
            <a
              href="https://x.com/KushWorld"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 border border-zinc-700 rounded-2xl font-bold text-center hover:border-[#00ff9d] transition"
            >
              Follow @KushWorld
            </a>
          </div>
        </div>

        {reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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