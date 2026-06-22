'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteLayout from '@/app/components/SiteLayout';

interface SubscriptionConfig {
  enabled: boolean;
  label?: string;
  tagline?: string;
  perksHeadline?: string;
  monthlyPrice?: number;
  plans?: Array<{
    id: string;
    label: string;
    description: string;
    priceMonthly: number;
    perks: Array<{ id: string; label: string; description: string }>;
  }>;
  billing?: {
    ready: boolean;
    message: string;
  };
}

export default function SubscribePage() {
  const [config, setConfig] = useState<SubscriptionConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subscriptions/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setConfig(data))
      .catch(() => setConfig({ enabled: false }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center text-zinc-500">
          Loading...
        </div>
      </SiteLayout>
    );
  }

  if (!config?.enabled) {
    notFound();
  }

  const plan = config.plans?.[0];

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs uppercase tracking-[3px] text-[#00ff9d] mb-3">Monthly membership</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{config.label || plan?.label}</h1>
        <p className="text-zinc-400 text-lg mb-8">{config.tagline || plan?.description}</p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8">
          <div className="text-5xl font-bold mb-2">
            ${(config.monthlyPrice ?? plan?.priceMonthly ?? 0).toFixed(2)}
            <span className="text-lg font-normal text-zinc-500"> / month</span>
          </div>
          <p className="text-sm text-zinc-500 mb-8">Cancel anytime. Billed monthly.</p>

          <h2 className="text-xl font-bold mb-4">{config.perksHeadline || 'What you get'}</h2>
          <ul className="space-y-4 mb-8">
            {(plan?.perks || []).map((perk) => (
              <li key={perk.id} className="flex gap-3">
                <span className="text-[#00ff9d] mt-1">✓</span>
                <div>
                  <p className="font-medium">{perk.label}</p>
                  <p className="text-sm text-zinc-500">{perk.description}</p>
                </div>
              </li>
            ))}
          </ul>

          {!config.billing?.ready && (
            <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl px-5 py-4 text-sm text-amber-100 mb-6">
              {config.billing?.message}
            </div>
          )}

          <Link
            href="/account"
            className="inline-flex px-8 py-4 rounded-2xl bg-[#00ff9d] text-black font-bold"
          >
            {config.billing?.ready ? 'Sign in to subscribe' : 'Sign in — launching soon'}
          </Link>
        </div>

        <p className="text-xs text-zinc-600 text-center">
          21+ only. Hemp products require ID verification for first-time buyers.
        </p>
      </div>
    </SiteLayout>
  );
}