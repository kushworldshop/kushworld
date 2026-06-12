'use client';

export function StarDisplay({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const stars = Math.round(rating);
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <span className={`text-yellow-400 ${sizeClass}`} aria-label={`${rating} out of 5 stars`}>
      {'★'.repeat(stars)}
      <span className="text-zinc-600">{'★'.repeat(5 - stars)}</span>
    </span>
  );
}

export function StarPicker({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition hover:scale-110 ${
            star <= rating ? 'text-yellow-400' : 'text-zinc-600'
          }`}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}