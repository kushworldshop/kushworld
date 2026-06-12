'use client';

import { useEffect, useState } from 'react';

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');

  const loadReviews = () => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => setReviews(data.reviews || []));
  };

  useEffect(() => { loadReviews(); }, [productId]);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const handleSubmit = async () => {
    if (!author || !comment) {
      setMessage('Name and review required');
      return;
    }

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, author, rating, comment }),
    });

    if (res.ok) {
      setComment('');
      setMessage('Review submitted!');
      loadReviews();
    }
  };

  return (
    <section className="mt-20 border-t border-zinc-800 pt-16">
      <h2 className="text-3xl font-bold mb-2">Customer Reviews</h2>
      <p className="text-zinc-400 mb-8">
        {reviews.length > 0
          ? `${avg.toFixed(1)} ★ average (${reviews.length} review${reviews.length !== 1 ? 's' : ''})`
          : 'No reviews yet — be the first!'}
      </p>

      <div className="space-y-6 mb-12">
        {reviews.map((r) => (
          <div key={r.id} className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="flex justify-between mb-2">
              <p className="font-semibold">{r.author}</p>
              <p className="text-yellow-400">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
            </div>
            <p className="text-zinc-400 text-sm">{r.comment}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700 max-w-lg">
        <h3 className="font-semibold mb-4">Review {productName}</h3>
        <input
          placeholder="Your name"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full bg-black border border-zinc-700 rounded-xl p-3 mb-3 text-sm"
        />
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full bg-black border border-zinc-700 rounded-xl p-3 mb-3 text-sm">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} stars</option>
          ))}
        </select>
        <textarea
          placeholder="Your review..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full bg-black border border-zinc-700 rounded-xl p-3 mb-3 text-sm"
        />
        <button onClick={handleSubmit} className="bg-[#00ff9d] text-black px-6 py-3 rounded-xl font-bold text-sm">
          Submit Review
        </button>
        {message && <p className="text-sm text-zinc-400 mt-3">{message}</p>}
      </div>
    </section>
  );
}