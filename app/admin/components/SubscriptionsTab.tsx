'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import type { PublicSubscriptionSummary } from '@/lib/subscriptionTypes';

type AdminSubscriptionRow = PublicSubscriptionSummary & { email?: string };

export default function SubscriptionsTab({
  featureEnabled,
}: {
  featureEnabled: boolean;
}) {
  const [subscriptions, setSubscriptions] = useState<AdminSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [price, setPrice] = useState('49.99');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch {
      setMessage('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createManual = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, price: Number(price) || 49.99 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setEmail('');
      setMessage('Manual subscription created.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const patchSubscription = async (id: string, action: 'activate' | 'cancel') => {
    setSaving(true);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, immediate: action === 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setMessage(`Subscription ${action === 'activate' ? 'activated' : 'cancelled'}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {!featureEnabled && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl px-5 py-4 text-sm text-amber-100">
          Customer-facing subscriptions are <strong>off</strong> (Coming Soon toggle). You can still
          create manual test memberships here.
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8">
        <h2 className="text-2xl font-bold mb-2">Manual membership</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Grant a monthly membership without billing — useful for testing before payment processor launch.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <input
            type="email"
            placeholder="Customer email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
          <button
            onClick={createManual}
            disabled={saving || !email.trim()}
            className="bg-[#00ff9d] text-black rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create manual sub'}
          </button>
        </div>
        {message && <p className="text-sm text-[#00ff9d]">{message}</p>}
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8">
        <h2 className="text-2xl font-bold mb-6">All subscriptions</h2>
        {loading ? (
          <p className="text-zinc-500">Loading...</p>
        ) : subscriptions.length === 0 ? (
          <p className="text-zinc-500">No subscriptions yet.</p>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-black border border-zinc-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <p className="font-mono text-[#00ff9d] text-sm">{sub.id}</p>
                  <p className="font-medium">{sub.planLabel}</p>
                  <p className="text-sm text-zinc-400">{sub.email}</p>
                  <p className="text-sm text-zinc-500">
                    ${sub.price.toFixed(2)} / mo · {sub.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  {sub.status !== 'active' && (
                    <button
                      onClick={() => patchSubscription(sub.id, 'activate')}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-sm"
                    >
                      Activate
                    </button>
                  )}
                  {sub.status === 'active' && (
                    <button
                      onClick={() => patchSubscription(sub.id, 'cancel')}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-red-900/40 text-sm"
                    >
                      Cancel
                    </button>
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