'use client';

import { useState } from 'react';
import { MAX_REVIEW_LENGTH } from '@/lib/reviewConstants';
import { StarPicker } from './StarRating';

interface ProductOption {
  id: string;
  name: string;
}

export default function ReviewForm({
  productId,
  productName,
  products,
  onSuccess,
  compact = false,
}: {
  productId?: string;
  productName?: string;
  products?: ProductOption[];
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(productId || '');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const remaining = MAX_REVIEW_LENGTH - comment.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError(false);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productId || selectedProduct || null,
          author,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || 'Could not submit review');
        setError(true);
        return;
      }

      setComment('');
      setMessage('Thanks! Your review is live.');
      onSuccess?.();
    } catch {
      setMessage('Network error. Please try again.');
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-zinc-900 rounded-2xl border border-zinc-700 ${compact ? 'p-5' : 'p-6 md:p-8'}`}
    >
      <h3 className={`font-bold mb-1 ${compact ? 'text-lg' : 'text-xl'}`}>
        {productName ? `Review ${productName}` : 'Leave a Short Review'}
      </h3>
      <p className="text-sm text-zinc-500 mb-5">
        Keep it short — {MAX_REVIEW_LENGTH} characters max, like a post on X.
      </p>

      <input
        required
        maxLength={50}
        placeholder="Your name or initials"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        className="w-full bg-black border border-zinc-700 rounded-xl p-3 mb-4 text-sm"
      />

      {!productId && products && products.length > 0 && (
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="w-full bg-black border border-zinc-700 rounded-xl p-3 mb-4 text-sm"
        >
          <option value="">General shop review</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      <div className="mb-4">
        <p className="text-sm text-zinc-400 mb-2">Your rating</p>
        <StarPicker rating={rating} onChange={setRating} />
      </div>

      <textarea
        required
        placeholder="What did you think? Fast shipping, quality, service..."
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, MAX_REVIEW_LENGTH))}
        rows={compact ? 3 : 4}
        className="w-full bg-black border border-zinc-700 rounded-xl p-3 mb-2 text-sm resize-none"
      />
      <p className={`text-xs mb-4 text-right ${remaining < 30 ? 'text-[#00ff9d]' : 'text-zinc-500'}`}>
        {remaining} characters left
      </p>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#00ff9d] text-black py-3 rounded-xl font-bold text-sm disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>

      {message && (
        <p className={`text-sm mt-3 ${error ? 'text-red-400' : 'text-[#00ff9d]'}`}>{message}</p>
      )}
    </form>
  );
}