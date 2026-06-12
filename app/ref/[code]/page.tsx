'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SiteLayout from '@/app/components/SiteLayout';
import { useReferralStore } from '@/lib/referralStore';
import { REFERRAL_DISCOUNT } from '@/lib/referralConstants';

export default function ReferralLanding() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase();
  const setReferral = useReferralStore((s) => s.setReferral);

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [referrerName, setReferrerName] = useState('');

  useEffect(() => {
    if (!code) {
      setStatus('invalid');
      return;
    }

    async function validate() {
      try {
        const res = await fetch(`/api/referrals?code=${encodeURIComponent(code)}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setStatus('invalid');
          return;
        }

        setReferrerName(data.referrerName);
        setReferral(data.code, data.referrerName);
        setStatus('valid');

        await fetch('/api/referrals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'click', code: data.code }),
        });
      } catch {
        setStatus('invalid');
      }
    }

    validate();
  }, [code, setReferral]);

  if (status === 'loading') {
    return (
      <SiteLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-zinc-400 text-lg">Loading your invite...</p>
        </div>
      </SiteLayout>
    );
  }

  if (status === 'invalid') {
    return (
      <SiteLayout>
        <div className="max-w-lg mx-auto px-6 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">Link Not Found</h1>
          <p className="text-zinc-400 mb-8">
            This referral link is invalid or expired. You can still shop Kush World.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold"
          >
            Shop Now
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#00ff9d]/20 text-4xl mb-6">
          🎁
        </div>
        <h1 className="text-4xl font-bold mb-4">
          {referrerName} invited you to Kush World
        </h1>
        <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
          You&apos;re all set. Your first order gets{' '}
          <span className="text-[#00ff9d] font-semibold">${REFERRAL_DISCOUNT} off</span>{' '}
          when you check out — we&apos;ve saved your referral automatically.
        </p>

        <div className="bg-zinc-900 border border-[#00ff9d]/30 rounded-2xl p-8 mb-10 text-left">
          <h2 className="font-bold text-lg mb-4">What you get</h2>
          <ul className="space-y-3 text-zinc-300 text-sm">
            <li>✓ ${REFERRAL_DISCOUNT} off your first order (min $25)</li>
            <li>✓ Lab-tested products with COAs</li>
            <li>✓ Discreet shipping nationwide</li>
            <li>✓ Loyalty points on every purchase</li>
          </ul>
        </div>

        <button
          onClick={() => router.push('/shop')}
          className="w-full sm:w-auto px-12 py-5 bg-[#00ff9d] text-black text-xl font-bold rounded-2xl hover:scale-105 transition"
        >
          Start Shopping
        </button>

        <p className="text-xs text-zinc-500 mt-6">
          Referral code: <span className="font-mono text-zinc-400">{code}</span>
        </p>
      </div>
    </SiteLayout>
  );
}