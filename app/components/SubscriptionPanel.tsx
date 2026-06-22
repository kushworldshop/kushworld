'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicSubscriptionSummary } from '@/lib/subscriptionTypes';
import type { PublicUserProfile } from '@/lib/users';

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

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusLabel(status: PublicSubscriptionSummary['status']) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial';
    case 'past_due':
      return 'Past due';
    case 'cancelled':
      return 'Cancelled';
    case 'paused':
      return 'Paused';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

export default function SubscriptionPanel({ user }: { user: PublicUserProfile }) {
  const [config, setConfig] = useState<SubscriptionConfig | null>(null);
  const [subscription, setSubscription] = useState<PublicSubscriptionSummary | null>(
    user.subscription ?? null
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/subscriptions/config').then((res) => (res.ok ? res.json() : null)),
      fetch('/api/subscriptions/me').then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([configData, meData]) => {
        setConfig(configData);
        if (meData?.active) setSubscription(meData.active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const plan = config?.plans?.[0];
  const billingReady = config?.billing?.ready ?? false;

  const handleSubscribe = async () => {
    setMessage('');
    setError('');
    setActionLoading(true);
    try {
      const res = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: 'monthly' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not start subscription');
        return;
      }
      setSubscription(data.subscription);
      setMessage('Subscription activated.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setMessage('');
    setError('');
    setActionLoading(true);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not cancel subscription');
        return;
      }
      setSubscription(data.subscription);
      setMessage(data.message || 'Cancellation scheduled.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading membership details...</p>;
  }

  if (!config?.enabled) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
        <h2 className="text-2xl font-bold mb-2">Membership</h2>
        <p className="text-zinc-400 text-sm">Monthly subscriptions are not available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {subscription ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[2px] text-zinc-500 mb-1">Your plan</p>
              <h2 className="text-2xl font-bold">{subscription.planLabel}</h2>
              <p className="text-zinc-400 text-sm mt-1">
                ${subscription.price.toFixed(2)} / month
              </p>
            </div>
            <span className="px-4 py-2 rounded-full bg-[#00ff9d]/10 text-[#00ff9d] text-sm font-medium">
              {statusLabel(subscription.status)}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
            <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-500 mb-1">Current period ends</p>
              <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
            </div>
            <div className="bg-black/40 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-500 mb-1">Next billing</p>
              <p className="font-medium">
                {subscription.cancelAtPeriodEnd
                  ? 'Ends at period close'
                  : formatDate(subscription.nextBillingDate)}
              </p>
            </div>
          </div>

          {subscription.cancelAtPeriodEnd ? (
            <p className="text-amber-300 text-sm mb-4">
              Cancellation is scheduled. You keep member perks until {formatDate(subscription.currentPeriodEnd)}.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleCancel}
              disabled={actionLoading}
              className="px-5 py-3 rounded-2xl border border-zinc-700 hover:border-zinc-500 text-sm disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Cancel at period end'}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <p className="text-xs uppercase tracking-[2px] text-[#00ff9d] mb-2">Monthly membership</p>
          <h2 className="text-3xl font-bold mb-2">{config.label || plan?.label}</h2>
          <p className="text-zinc-400 mb-6">{config.tagline || plan?.description}</p>

          <div className="text-4xl font-bold mb-6">
            ${(config.monthlyPrice ?? plan?.priceMonthly ?? 0).toFixed(2)}
            <span className="text-base font-normal text-zinc-500"> / month</span>
          </div>

          {plan?.perks?.length ? (
            <div className="mb-8">
              <h3 className="font-semibold mb-3">{config.perksHeadline || 'Member perks'}</h3>
              <ul className="space-y-3">
                {plan.perks.map((perk) => (
                  <li key={perk.id} className="flex gap-3 text-sm">
                    <span className="text-[#00ff9d]">✓</span>
                    <span>
                      <span className="font-medium block">{perk.label}</span>
                      <span className="text-zinc-500">{perk.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!billingReady ? (
            <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl px-5 py-4 text-sm text-amber-100 mb-4">
              {config.billing?.message || 'Billing is being set up. Check back soon.'}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={actionLoading || !billingReady}
              className="px-6 py-3 rounded-2xl bg-[#00ff9d] text-black font-bold disabled:opacity-50"
            >
              {actionLoading ? 'Starting...' : 'Subscribe monthly'}
            </button>
            <Link
              href="/subscribe"
              className="px-6 py-3 rounded-2xl border border-zinc-700 hover:border-zinc-500 text-sm"
            >
              View plan details
            </Link>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-[#00ff9d]">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}