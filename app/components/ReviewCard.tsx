'use client';

import Link from 'next/link';
import { StarDisplay } from './StarRating';

export interface ReviewCardData {
  id: string;
  productId: string | null;
  productName?: string | null;
  productSlug?: string | null;
  author: string;
  rating: number;
  comment: string;
  source: 'customer' | 'x';
  xHandle?: string;
  xUrl?: string;
  createdAt: string;
}

export default function ReviewCard({ review }: { review: ReviewCardData }) {
  const date = new Date(review.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold">{review.author}</p>
          {review.xHandle && (
            <p className="text-xs text-zinc-500">{review.xHandle}</p>
          )}
        </div>
        <StarDisplay rating={review.rating} size="sm" />
      </div>

      <p className="text-zinc-300 text-sm leading-relaxed flex-1">&ldquo;{review.comment}&rdquo;</p>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
        <span>{date}</span>
        <div className="flex items-center gap-2">
          {review.source === 'x' && (
            <span className="text-[#00ff9d]">From X</span>
          )}
          {review.productName && review.productSlug && (
            <Link href={`/products/${review.productSlug}`} className="hover:text-[#00ff9d] transition">
              {review.productName}
            </Link>
          )}
          {review.xUrl && (
            <a
              href={review.xUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00ff9d] transition"
            >
              View on X →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}