'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  WHEEL_SEGMENTS,
  getSpinPrizeDaysRemaining,
  getWheelRotationDelta,
  type SpinPrize,
} from '@/lib/spinWheelTypes';

interface SpinWheelProps {
  points: number;
  spinCost: number;
  pendingPrize: SpinPrize | null | undefined;
  savedCoupons: SpinPrize[];
  onPrizeChange: (update: {
    remainingPoints?: number;
    pendingPrize?: SpinPrize | null;
    savedCoupons?: SpinPrize[];
  }) => void;
}

export default function SpinWheel({
  points,
  spinCost,
  pendingPrize,
  savedCoupons,
  onPrizeChange,
}: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [wonPrize, setWonPrize] = useState<SpinPrize | null>(null);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);

  const displayPending = pendingPrize ?? wonPrize;
  const mustDecide = !!displayPending;

  const gradient = WHEEL_SEGMENTS.map((seg, i) => {
    const start = (i / WHEEL_SEGMENTS.length) * 100;
    const end = ((i + 1) / WHEEL_SEGMENTS.length) * 100;
    return `${seg.color} ${start}% ${end}%`;
  }).join(', ');

  const handleSpin = async () => {
    if (spinning || mustDecide) return;
    if (points < spinCost) {
      setError(`You need ${spinCost} points to spin`);
      return;
    }

    setSpinning(true);
    setError('');
    setResult(null);
    setWonPrize(null);

    try {
      const res = await fetch('/api/loyalty/spin', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Spin failed');
        setSpinning(false);
        return;
      }

      setRotation((prev) => prev + getWheelRotationDelta(data.segmentId, prev));

      setTimeout(() => {
        setResult(data.message);
        setWonPrize(data.prize ?? null);
        onPrizeChange({
          remainingPoints: data.remainingPoints,
          pendingPrize: data.prize ?? null,
        });
        setSpinning(false);
      }, 4200);
    } catch {
      setError('Network error. Try again.');
      setSpinning(false);
    }
  };

  const handleAccept = async () => {
    setActing(true);
    setError('');
    try {
      const res = await fetch('/api/loyalty/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.message);
        setWonPrize(null);
        onPrizeChange({
          pendingPrize: null,
          savedCoupons: data.savedCoupons ?? savedCoupons,
        });
      } else {
        setError(data.error || 'Could not save coupon');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setActing(false);
    }
  };

  const handleForfeit = async () => {
    setActing(true);
    setError('');
    try {
      const res = await fetch('/api/loyalty/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forfeit' }),
      });
      const data = await res.json();
      if (data.success) {
        setResult('Prize forfeited — spin again!');
        setWonPrize(null);
        onPrizeChange({ pendingPrize: null });
      } else {
        setError(data.error || 'Could not forfeit prize');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setActing(false);
    }
  };

  const prizeDescription = (prize: SpinPrize) => {
    if (prize.type === 'free_tshirt') {
      return 'Free studio tee at checkout — not a promo code.';
    }
    if (prize.type === 'free_shipping') {
      return 'Free shipping coupon — use one wheel coupon per order.';
    }
    return 'Saved to your profile — pick one wheel coupon at checkout.';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-8">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent border-t-[#00ff9d]" />

        <div
          className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full border-4 border-[#00ff9d] shadow-[0_0_40px_rgba(0,255,157,0.25)]"
          style={{
            background: `conic-gradient(from -90deg, ${gradient})`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
          }}
        >
          {WHEEL_SEGMENTS.map((seg, i) => {
            const segmentAngle = 360 / WHEEL_SEGMENTS.length;
            const angle = segmentAngle * i + segmentAngle / 2;
            return (
              <div
                key={seg.id}
                className="absolute inset-0 flex items-start justify-center pointer-events-none"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <span
                  className="mt-6 text-[10px] sm:text-xs font-bold text-white drop-shadow-md text-center px-1"
                  style={{ transform: 'rotate(90deg)', maxWidth: 72 }}
                >
                  {seg.label}
                </span>
              </div>
            );
          })}

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black border-2 border-[#00ff9d] flex items-center justify-center text-xs font-bold text-[#00ff9d]">
              SPIN
            </div>
          </div>
        </div>
      </div>

      {displayPending ? (
        <div className="w-full max-w-md bg-black border border-amber-400/40 rounded-2xl p-5 mb-4 text-center">
          <p className="text-sm text-zinc-400 mb-1">You won — keep it?</p>
          <p className="text-xl font-bold text-amber-300">{displayPending.label}</p>
          <p className="text-xs text-zinc-500 mt-2">{prizeDescription(displayPending)}</p>
          <p className="text-xs text-zinc-500 mt-1">
            Accept to save for 7 days. Different prize types can stack on your profile — pick one at checkout.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <button
              onClick={handleAccept}
              disabled={acting}
              className="bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            >
              {acting ? 'Saving...' : 'Accept & save 7 days'}
            </button>
            <button
              onClick={handleForfeit}
              disabled={acting}
              className="text-sm text-zinc-400 hover:text-white underline px-4 py-3"
            >
              Forfeit & spin again
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleSpin}
          disabled={spinning || points < spinCost}
          className="bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black px-10 py-4 rounded-2xl font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed mb-4"
        >
          {spinning ? 'Spinning...' : `Spin for ${spinCost} pts`}
        </button>
      )}

      {savedCoupons.length > 0 && !displayPending && (
        <div className="w-full max-w-md bg-black/60 border border-[#00ff9d]/25 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-zinc-500 text-center mb-2">
            Saved coupons ({savedCoupons.length}) — use one per order
          </p>
          <ul className="space-y-1">
            {savedCoupons.map((coupon) => (
              <li key={coupon.id} className="text-xs text-center text-zinc-400">
                <span className="text-[#00ff9d] font-medium">{coupon.label}</span>
                {' · '}
                {getSpinPrizeDaysRemaining(coupon)} day
                {getSpinPrizeDaysRemaining(coupon) === 1 ? '' : 's'} left
              </li>
            ))}
          </ul>
          <p className="text-xs text-center mt-2">
            <Link href="/checkout" className="text-[#00ff9d] hover:underline">
              Choose at checkout →
            </Link>
          </p>
        </div>
      )}

      <p className="text-sm text-zinc-500 mb-2">
        Balance: <span className="text-[#00ff9d] font-medium">{points.toLocaleString()} pts</span>
      </p>

      {result && !displayPending && (
        <div className="text-center max-w-sm space-y-2">
          <p className="text-[#00ff9d] text-sm">{result}</p>
        </div>
      )}
      {error && <p className="text-red-400 text-sm text-center max-w-sm">{error}</p>}
    </div>
  );
}