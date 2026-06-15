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

  const [reactions, setReactions] = useState<Record<string, number>>(review.reactions || {});

  const handleReact = async (emoteName: string) => {
    const current = reactions[emoteName] || 0;
    setReactions({ ...reactions, [emoteName]: current + 1 });

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: review.id, emote: emoteName }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reactions) setReactions(data.reactions);
      }
    } catch {
      setReactions(reactions);
    }
  };

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
        {EMOTES.map((emote) => {
          const count = reactions[emote.name] || 0;
          return (
            <button
              key={emote.name}
              onClick={() => handleReact(emote.name)}
              className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full text-[10px] transition border border-zinc-700 hover:border-[#00ff9d]/50"
              title={emote.label}
            >
              <span className="text-[9px] leading-none font-bold text-[#00ff9d]">{emote.label.split(' ').map(w => w[0]).join('')}</span>
              {count > 0 && <span className="text-zinc-400 text-[10px]">{count}</span>}
            </button>
          );
        })}
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