'use client';

import { useState } from 'react';
import {
  WHEEL_SEGMENTS,
  getWheelRotation,
  type SpinPrize,
} from '@/lib/spinWheelTypes';

interface SpinWheelProps {
  points: number;
  spinCost: number;
  activePrize: SpinPrize | null | undefined;
  onSpinComplete: (remainingPoints: number, prize: SpinPrize | null) => void;
}

export default function SpinWheel({ points, spinCost, activePrize, onSpinComplete }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  const gradient = WHEEL_SEGMENTS.map((seg, i) => {
    const start = (i / WHEEL_SEGMENTS.length) * 100;
    const end = ((i + 1) / WHEEL_SEGMENTS.length) * 100;
    return `${seg.color} ${start}% ${end}%`;
  }).join(', ');

  const handleSpin = async () => {
    if (spinning || activePrize) return;
    if (points < spinCost) {
      setError(`You need ${spinCost} points to spin`);
      return;
    }

    setSpinning(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/loyalty/spin', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Spin failed');
        setSpinning(false);
        return;
      }

      const targetRotation = getWheelRotation(data.segmentId);
      setRotation((prev) => prev + targetRotation);

      setTimeout(() => {
        setResult(data.message);
        onSpinComplete(data.remainingPoints, data.prize ?? null);
        setSpinning(false);
      }, 4200);
    } catch {
      setError('Network error. Try again.');
      setSpinning(false);
    }
  };

  const handleForfeit = async () => {
    setError('');
    const res = await fetch('/api/loyalty/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'forfeit' }),
    });
    const data = await res.json();
    if (data.success) {
      setResult('Prize forfeited — spin again!');
      onSpinComplete(points, null);
    } else {
      setError(data.error || 'Could not forfeit prize');
    }
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
            const angle = (360 / WHEEL_SEGMENTS.length) * i + 360 / WHEEL_SEGMENTS.length / 2 - 90;
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

      {activePrize ? (
        <div className="w-full max-w-md bg-black border border-[#00ff9d]/40 rounded-2xl p-5 mb-4 text-center">
          <p className="text-sm text-zinc-400 mb-1">Active prize</p>
          <p className="text-xl font-bold text-[#00ff9d]">{activePrize.label}</p>
          <p className="text-xs text-zinc-500 mt-2">
            Expires {new Date(activePrize.expiresAt).toLocaleDateString()} · Use at checkout
          </p>
          <button
            onClick={handleForfeit}
            className="mt-4 text-sm text-zinc-400 hover:text-white underline"
          >
            Forfeit & spin again
          </button>
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

      <p className="text-sm text-zinc-500 mb-2">
        Balance: <span className="text-[#00ff9d] font-medium">{points.toLocaleString()} pts</span>
      </p>

      {result && <p className="text-[#00ff9d] text-sm text-center max-w-sm">{result}</p>}
      {error && <p className="text-red-400 text-sm text-center max-w-sm">{error}</p>}

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-lg">
        {WHEEL_SEGMENTS.filter((s) => s.type !== 'try_again').map((seg) => (
          <div
            key={seg.id}
            className="text-center text-xs bg-zinc-900 rounded-xl p-3 border border-zinc-800"
          >
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: seg.color }} />
            {seg.label}
          </div>
        ))}
      </div>
    </div>
  );
}