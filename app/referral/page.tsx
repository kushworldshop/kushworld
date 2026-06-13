'use client';

import { useState } from 'react';
import SiteLayout from '@/app/components/SiteLayout';
import { REFERRAL_DISCOUNT, REFERRER_REWARD_POINTS } from '@/lib/referralConstants';

interface ReferralData {
  code: string;
  referrerName: string;
  link: string;
  clicks: number;
  conversions: number;
  rewardPerReferral: number;
  pointsToAdd?: number;
}

export default function ReferralDashboard() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Could not create referral link');
        return;
      }

      setReferral(data);
      await loadExistingRewards(email);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingRewards = async (lookupEmail: string) => {
    const res = await fetch(`/api/referrals?email=${encodeURIComponent(lookupEmail)}`, {
      credentials: 'include',
    });
    if (res.status === 401) return;

    const data = await res.json();
    if (data.exists) {
      setReferral(data);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/referrals?email=${encodeURIComponent(email)}`, {
        credentials: 'include',
      });
      if (res.status === 401) {
        setError('Sign in to your account to look up an existing referral link.');
        return;
      }
      const data = await res.json();
      if (!data.exists) {
        setError('No referral link found for this email. Create one below.');
        return;
      }
      setReferral(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!referral?.link) return;
    await navigator.clipboard.writeText(referral.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">Refer & Earn</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Share your personal link with friends. They get ${REFERRAL_DISCOUNT} off their first order,
          and you earn {REFERRER_REWARD_POINTS} loyalty points for every completed referral.
        </p>

        {!referral ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              required
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4"
            />
            <input
              required
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00ff9d] text-black py-4 rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Get My Referral Link'}
            </button>
            <p className="text-center text-sm text-zinc-500">
              Already have a link?{' '}
              <button type="button" onClick={handleLookup} className="text-[#00ff9d] hover:underline">
                Look it up by email
              </button>
            </p>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-[#00ff9d]/30 rounded-2xl p-8">
              <p className="text-sm text-zinc-400 mb-2">Your referral link</p>
              <p className="font-mono text-sm break-all text-[#00ff9d] mb-4">{referral.link}</p>
              <button
                onClick={copyLink}
                className="w-full bg-[#00ff9d] text-black py-3 rounded-xl font-bold"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-zinc-900 rounded-2xl p-6">
                <div className="text-3xl font-bold text-[#00ff9d]">{referral.clicks}</div>
                <p className="text-sm text-zinc-400 mt-1">Link Clicks</p>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-6">
                <div className="text-3xl font-bold text-[#00ff9d]">{referral.conversions}</div>
                <p className="text-sm text-zinc-400 mt-1">Orders</p>
              </div>
              <div className="bg-zinc-900 rounded-2xl p-6">
                <div className="text-3xl font-bold text-[#00ff9d]">
                  {referral.conversions * referral.rewardPerReferral}
                </div>
                <p className="text-sm text-zinc-400 mt-1">Points Earned</p>
              </div>
            </div>

            <p className="text-sm text-zinc-500 text-center">
              Code: <span className="font-mono text-zinc-300">{referral.code}</span>
            </p>

            <button
              onClick={() => setReferral(null)}
              className="w-full text-zinc-400 hover:text-white text-sm"
            >
              Create a different link
            </button>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}