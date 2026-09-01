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
}

interface Settings {
  creditDollars: number;
  expiryDays: number;
  tradePoints: number;
  tradeSpins: number;
  spinCost: number;
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
      onUpdated?.();
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

  return (
    <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
      <h2 className="text-2xl font-bold mb-2">TouchDown / TD Posts</h2>
      <p className="text-zinc-400 text-sm mb-6 max-w-2xl">
        Drop a public post of your pack landing — X, Instagram, TikTok, YouTube, and more. We automatically add a{' '}
        <strong className="text-[#00ff9d]">${dollars} coupon credit</strong> to your account. One unused credit at a
        time (they don&apos;t stack). Use it at checkout or trade it for{' '}
        <strong className="text-[#00ff9d]">{spins} wheel spin{spins === 1 ? '' : 's'}</strong>.
      </p>

      <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4 mb-6 text-sm text-zinc-400 space-y-1">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Rules</p>
        <p>• Full post URL only — no short links or profile pages</p>
        <p>• One ${dollars} credit per TD post · coupons do not stack</p>
        <p>• Use the credit on your next order, or trade it for wheel spins</p>
        <p>• Must have at least one completed order and a verified email or phone</p>
        <p>• Each post can only be claimed once</p>
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
          placeholder="https://x.com/you/status/… or Instagram / TikTok post"
          className="flex-1 bg-black border border-zinc-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[#00ff9d]"
          disabled={Boolean(activeCredit)}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || !postUrl.trim() || Boolean(activeCredit)}
          className="bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold disabled:opacity-50 shrink-0"
        >
          {submitting ? 'Adding…' : `Submit for $${dollars}`}
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
                  {row.status === 'credited' ? `$${dollars} ready` : row.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
