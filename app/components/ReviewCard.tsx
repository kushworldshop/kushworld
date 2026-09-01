'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StarDisplay } from './StarRating';
import { EMOTES } from '@/lib/emotes';

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
  reactions?: Record<string, number>;
}

export default function ReviewCard({ review }: { review: ReviewCardData }) {
  const date = new Date(review.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const [reactions] = useState<Record<string, number>>(review.reactions || {});

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

      <div className="flex flex-wrap gap-1 mt-3">
        {EMOTES.filter((emote) => (reactions[emote.name] || 0) > 0)
          .slice(0, 4)
          .map((emote) => (
            <span
              key={emote.name}
              className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-full text-[10px] border border-zinc-700"
              title={emote.label}
            >
              <img
                src={`/emotes/${emote.file}`}
                alt={emote.label}
                className="w-3.5 h-3.5"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="text-zinc-400 text-[10px]">{reactions[emote.name]}</span>
            </span>
          ))}
      </div>

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