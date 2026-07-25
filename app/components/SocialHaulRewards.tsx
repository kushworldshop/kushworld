'use client';

import { useCallback, useEffect, useState } from 'react';

interface Submission {
  id: string;
  postUrl: string;
  postId: string;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded: number;
  rejectReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

interface Settings {
  rewardPoints: number;
  maxPending: number;
  maxPerWeek: number;
  maxApprovedPerMonth: number;
  requirePurchase: boolean;
}

export default function SocialHaulRewards({
  loyaltyEnabled = true,
}: {
  loyaltyEnabled?: boolean;
  onPointsHint?: () => void;
}) {
  const [postUrl, setPostUrl] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/social-rewards');
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data.submissions || []);
        setSettings(data.settings || null);
      }
    } catch {
      // silent — section still usable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loyaltyEnabled) load();
  }, [loyaltyEnabled, load]);

  const submit = async () => {
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/social-rewards', {
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
      setMessage(data.message || 'Submitted for review.');
    } catch {
      setError('Could not submit post. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!loyaltyEnabled) return null;

  const rewardPts = settings?.rewardPoints ?? 200;

  return (
    <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
      <h2 className="text-2xl font-bold mb-2">Earn Points on X</h2>
      <p className="text-zinc-400 text-sm mb-6 max-w-2xl">
        Post your Kush World haul or experience on X, copy the post link, and submit it here.
        After admin review you earn <strong className="text-[#00ff9d]">{rewardPts.toLocaleString()} points</strong>{' '}
        (${(rewardPts / 100).toFixed(0)} off value). Tag{' '}
        <a
          href="https://x.com/KushWorld"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00ff9d] hover:underline"
        >
          @KushWorld
        </a>{' '}
        for the best chance of approval.
      </p>

      <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4 mb-6 text-sm text-zinc-400 space-y-1">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Rules (anti-scam)</p>
        <p>• Full x.com / twitter.com post links only — no short links</p>
        <p>• Each post can only be rewarded once (any account)</p>
        <p>• Must complete at least one order first</p>
        <p>• Verify email or phone on your account</p>
        <p>
          • Limits: {settings?.maxPending ?? 2} pending · {settings?.maxPerWeek ?? 3}/week ·{' '}
          {settings?.maxApprovedPerMonth ?? 8} approved/month
        </p>
        <p>• Fake, unrelated, or recycled posts will be rejected</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="url"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder="https://x.com/you/status/1234567890"
          className="flex-1 bg-black border border-zinc-700 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[#00ff9d]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !postUrl.trim()}
          className="bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold disabled:opacity-50 shrink-0"
        >
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </div>

      {message && <p className="text-sm text-[#00ff9d] mb-4">{message}</p>}
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div>
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Your submissions</p>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-zinc-500">No haul posts submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-black border border-zinc-800 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <a
                    href={s.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#00ff9d] hover:underline break-all"
                  >
                    {s.postUrl}
                  </a>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(s.createdAt).toLocaleString()}
                    {s.rejectReason ? ` · ${s.rejectReason}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-xs uppercase tracking-wider font-medium ${
                      s.status === 'approved'
                        ? 'text-[#00ff9d]'
                        : s.status === 'pending'
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}
                  >
                    {s.status}
                  </span>
                  {s.pointsAwarded > 0 && (
                    <p className="text-xs text-zinc-400">+{s.pointsAwarded} pts</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}