'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getSpinPrizeDaysRemaining, type SpinPrize } from '@/lib/spinWheelTypes';

interface Submission {
  id: string;
  postUrl: string;
  platform: string;
  status: 'credited' | 'used' | 'traded' | 'revoked';
  createdAt: string;
  revokeReason?: string;
  rewardType?: 'coupon' | 'points';
  pointsAwarded?: number;
  xHandle?: string;
}

interface Settings {
  creditDollars: number;
  creditPoints: number;
  expiryDays: number;
  tradePoints: number;
  tradeSpins: number;
  spinCost: number;
  hashtag?: string;
}

export default function TouchdownRewards({
  onUpdated,
}: {
  onUpdated?: (update?: { remainingPoints?: number; savedCoupons?: SpinPrize[] }) => void;
}) {
  const [postUrl, setPostUrl] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeCredit, setActiveCredit] = useState<SpinPrize | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [trading, setTrading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/td-rewards');
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data.submissions || []);
        setActiveCredit(data.activeCredit || null);
        setSettings(data.settings || null);
      }
    } catch {
      // section still usable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/td-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit post');
        return;
      }
      setPostUrl('');
      setSubmissions(data.submissions || []);
      setActiveCredit(data.activeCredit || data.coupon || null);
      setMessage(data.message || '$5 TD credit added.');
      onUpdated?.({ remainingPoints: data.remainingPoints });
    } catch {
      setError('Could not submit post. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const trade = async () => {
    setTrading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/td-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trade' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not trade credit');
        return;
      }
      setSubmissions(data.submissions || []);
      setActiveCredit(null);
      setMessage(data.message || 'Traded for wheel spins.');
      onUpdated?.({ remainingPoints: data.remainingPoints });
    } catch {
      setError('Could not trade credit. Try again.');
    } finally {
      setTrading(false);
    }
  };

  const dollars = settings?.creditDollars ?? 5;
  const spins = settings?.tradeSpins ?? 3;
  const days = settings?.expiryDays ?? 30;
  const points = settings?.creditPoints ?? 500;
  const hashtag = settings?.hashtag || 'KushWorldTD';

  return (
    <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
      <h2 className="text-2xl font-bold mb-2">TouchDown / TD Posts</h2>
      <p className="text-zinc-400 text-sm mb-6 max-w-2xl">
        Post your pack landing on X with <strong className="text-[#00ff9d]">#{hashtag}</strong>. Save the same X
        username on your profile and we match it automatically for{' '}
        <strong className="text-[#00ff9d]">{points.toLocaleString()} loyalty points</strong> (${dollars} value). You can
        also paste the post URL below. Other platforms still get a ${dollars} coupon — one unused coupon at a time, no
        stacking.
      </p>

      <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4 mb-6 text-sm text-zinc-400 space-y-1">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Rules</p>
        <p>• Put #{hashtag} in the X post</p>
        <p>• X username on your profile must match the post</p>
        <p>• {points.toLocaleString()} loyalty points per matched X post · each post once</p>
        <p>• Instagram / TikTok / YouTube URLs still get a ${dollars} coupon (no stacking)</p>
        <p>• Must have at least one completed order</p>
      </div>

      {activeCredit && (
        <div className="bg-black border border-[#00ff9d]/30 rounded-2xl p-5 mb-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Active TD credit</p>
          <p className="text-xl font-bold text-[#00ff9d]">{activeCredit.label}</p>
          <p className="text-sm text-zinc-500 mt-2">
            Expires {activeCredit.expiresAt ? new Date(activeCredit.expiresAt).toLocaleDateString() : 'N/A'}
            {getSpinPrizeDaysRemaining(activeCredit) !== null && (
              <>
                {' '}
                · {getSpinPrizeDaysRemaining(activeCredit)} day
                {getSpinPrizeDaysRemaining(activeCredit) === 1 ? '' : 's'} left
              </>
            )}
            {activeCredit.tdPostUrl ? (
              <>
                {' '}
                ·{' '}
                <a href={activeCredit.tdPostUrl} target="_blank" rel="noopener noreferrer" className="text-[#00ff9d] hover:underline">
                  view post
                </a>
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/checkout" className="bg-[#00ff9d] text-black px-5 py-3 rounded-xl text-sm font-bold">
              Use ${dollars} at checkout
            </Link>
            <button
              type="button"
              onClick={() => void trade()}
              disabled={trading}
              className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {trading ? 'Trading…' : `Trade for ${spins} wheel spin${spins === 1 ? '' : 's'}`}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            One coupon per order — TD credits cannot stack with other promo or wheel coupons at checkout.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="url"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder="https://x.com/you/status/… with #KushWorldTD"
          className="flex-1 bg-black border border-zinc-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[#00ff9d]"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || !postUrl.trim()}
          className="bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold disabled:opacity-50 shrink-0"
        >
          {submitting ? 'Adding…' : 'Submit post'}
        </button>
      </div>
      {activeCredit && (
        <p className="text-xs text-zinc-500 mb-4">
          Use or trade your current ${dollars} credit before submitting another TD post. Credits expire in {days} days.
        </p>
      )}

      {message && <p className="text-sm text-[#00ff9d] mb-4">{message}</p>}
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div>
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Your TD posts</p>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-zinc-500">No TouchDown posts submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((row) => (
              <div
                key={row.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-black border border-zinc-800 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <a
                    href={row.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#00ff9d] hover:underline break-all"
                  >
                    {row.postUrl}
                  </a>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(row.createdAt).toLocaleString()}
                    {row.platform ? ` · ${row.platform}` : ''}
                    {row.revokeReason ? ` · ${row.revokeReason}` : ''}
                  </p>
                </div>
                <span
                  className={`text-xs uppercase tracking-wider font-medium shrink-0 ${
                    row.status === 'credited'
                      ? 'text-[#00ff9d]'
                      : row.status === 'used'
                        ? 'text-zinc-300'
                        : row.status === 'traded'
                          ? 'text-sky-400'
                          : 'text-red-400'
                  }`}
                >
                  {row.rewardType === 'points' && (row.pointsAwarded || 0) > 0
                    ? `+${row.pointsAwarded} pts`
                    : row.status === 'credited'
                      ? `$${dollars} ready`
                      : row.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
