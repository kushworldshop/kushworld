'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { formatCartItemOptions } from '@/lib/productOptions';

interface CartSnapshotItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  selectedOptions?: Record<string, string>;
  selectedSize?: string;
  optionSkus?: string;
  category?: string;
  isFirstOrderBonus?: boolean;
}

interface CartSnapshot {
  ownerKey: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  isGuest: boolean;
  guestTrackId?: string;
  items: CartSnapshotItem[];
  subtotal: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  reminderSentAt?: string;
}

interface CartMeta {
  totalCarts: number;
  totalItems: number;
  totalValue: number;
  loggedInCarts: number;
  guestCarts: number;
  updatedAt: string;
}

interface AbandonedMeta {
  abandonedCount: number;
  eligibleForReminder: number;
  remindedCount: number;
  staleCount: number;
  settings: {
    abandonedHours: number;
    reminderCooldownDays: number;
    staleDays: number;
  };
}

interface AbandonedActionResult {
  pruned?: number;
  eligible?: number;
  sent?: number;
  skipped?: number;
  failed?: number;
  dryRun?: boolean;
  message?: string;
}

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

export default function CartsTab() {
  const [carts, setCarts] = useState<CartSnapshot[]>([]);
  const [meta, setMeta] = useState<CartMeta>({
    totalCarts: 0,
    totalItems: 0,
    totalValue: 0,
    loggedInCarts: 0,
    guestCarts: 0,
    updatedAt: '',
  });
  const [abandoned, setAbandoned] = useState<AbandonedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<AbandonedActionResult | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const loadCartStats = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/cart-stats');
      if (res.ok) {
        const data = await res.json();
        setCarts(data.carts || []);
        setMeta({
          totalCarts: data.totalCarts ?? 0,
          totalItems: data.totalItems ?? 0,
          totalValue: data.totalValue ?? 0,
          loggedInCarts: data.loggedInCarts ?? 0,
          guestCarts: data.guestCarts ?? 0,
          updatedAt: data.updatedAt ?? '',
        });
        setAbandoned(data.abandoned ?? null);
      }
    } catch {
      console.error('Failed to load cart stats');
    } finally {
      setLoading(false);
    }
  };

  const runAbandonedAction = async (action: 'send' | 'dry_run' | 'cleanup') => {
    setActionLoading(action);
    setActionResult(null);
    try {
      const res = await adminFetch('/api/admin/abandoned-carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'cleanup' ? 'cleanup' : 'send',
          dryRun: action === 'dry_run',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionResult({
          pruned: data.pruned,
          eligible: data.eligible,
          sent: data.sent,
          skipped: data.skipped,
          failed: data.failed,
          dryRun: data.dryRun,
          message:
            action === 'cleanup'
              ? `Removed ${data.pruned ?? 0} stale cart(s).`
              : action === 'dry_run'
                ? `Would email ${data.eligible ?? 0} cart(s).`
                : `Sent ${data.sent ?? 0} reminder(s).`,
        });
        await loadCartStats();
      } else {
        setActionResult({ message: data.error || 'Action failed' });
      }
    } catch {
      setActionResult({ message: 'Action failed' });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    loadCartStats();
  }, []);

  const abandonedHours = abandoned?.settings.abandonedHours ?? 1;

  return (
    <div className="mb-10">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Live Carts</h2>
            <p className="text-zinc-400 text-sm max-w-2xl">
              See what customers and guests currently have in their carts. Abandoned cart emails go to logged-in customers after {abandonedHours} hour{abandonedHours === 1 ? '' : 's'} of inactivity.
            </p>
          </div>
          <button
            onClick={loadCartStats}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Active carts</p>
            <p className="text-3xl font-bold text-[#00ff9d]">{meta.totalCarts}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total items</p>
            <p className="text-3xl font-bold">{meta.totalItems}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Cart value</p>
            <p className="text-3xl font-bold">${meta.totalValue.toFixed(0)}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Logged in</p>
            <p className="text-3xl font-bold">{meta.loggedInCarts}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Guests</p>
            <p className="text-3xl font-bold">{meta.guestCarts}</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
          <div>
            <h3 className="text-xl font-bold mb-2">Abandoned Cart Reminders</h3>
            <p className="text-zinc-400 text-sm max-w-2xl">
              Automatically email logged-in customers who left items in their cart. Guests are visible here but cannot receive emails. Stale carts older than {abandoned?.settings.staleDays ?? 30} days are auto-removed when reminders run.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => runAbandonedAction('send')}
              disabled={!!actionLoading}
              className="bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black px-5 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {actionLoading === 'send' ? 'Sending...' : 'Send reminders now'}
            </button>
            <button
              onClick={() => runAbandonedAction('dry_run')}
              disabled={!!actionLoading}
              className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {actionLoading === 'dry_run' ? 'Checking...' : 'Preview eligible'}
            </button>
            <button
              onClick={() => runAbandonedAction('cleanup')}
              disabled={!!actionLoading}
              className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {actionLoading === 'cleanup' ? 'Cleaning...' : 'Cleanup stale'}
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Abandoned</p>
            <p className="text-2xl font-bold text-amber-400">{abandoned?.abandonedCount ?? 0}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Eligible for email</p>
            <p className="text-2xl font-bold text-[#00ff9d]">{abandoned?.eligibleForReminder ?? 0}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Reminders sent</p>
            <p className="text-2xl font-bold">{abandoned?.remindedCount ?? 0}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Stale (to prune)</p>
            <p className="text-2xl font-bold text-zinc-400">{abandoned?.staleCount ?? 0}</p>
          </div>
        </div>

        {actionResult?.message && (
          <p className="text-sm text-zinc-300 bg-black/40 border border-zinc-800 rounded-xl px-4 py-3">
            {actionResult.message}
            {actionResult.failed ? ` · ${actionResult.failed} failed` : ''}
            {actionResult.skipped ? ` · ${actionResult.skipped} skipped` : ''}
          </p>
        )}

        <p className="text-xs text-zinc-600 mt-4">
          Hourly auto-send: set <code className="text-zinc-500">CRON_SECRET</code> on the server and add{' '}
          <code className="text-zinc-500">scripts/run-abandoned-carts-cron.mjs</code> to crontab.
        </p>
      </div>

      {loading ? (
        <p className="text-center py-20 text-zinc-400">Loading live carts...</p>
      ) : carts.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-12 text-center">
          <p className="text-xl text-zinc-400 mb-2">No active carts yet</p>
          <p className="text-sm text-zinc-500">
            Carts appear when visitors add items on the shop. Data syncs automatically within a few seconds of cart changes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {carts.map((cart) => {
            const expanded = expandedKey === cart.ownerKey;
            const label = cart.isGuest
              ? 'Guest visitor'
              : cart.userName || cart.userEmail || 'Logged-in customer';
            const idleHours = hoursSince(cart.updatedAt);
            const isAbandoned = !cart.isGuest && cart.userEmail && idleHours >= abandonedHours;

            return (
              <div key={cart.ownerKey} className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedKey(expanded ? null : cart.ownerKey)}
                  className="w-full p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center text-left hover:bg-zinc-800/40 transition"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                        cart.isGuest ? 'bg-zinc-800 text-zinc-300' : 'bg-[#00ff9d]/10 text-[#00ff9d]'
                      }`}
                    >
                      {cart.isGuest ? 'G' : (cart.userName?.[0] || cart.userEmail?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold truncate">{label}</p>
                        {isAbandoned && (
                          <span className="text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            Abandoned
                          </span>
                        )}
                        {cart.reminderSentAt && (
                          <span className="text-[10px] uppercase tracking-wider bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/20 px-2 py-0.5 rounded-full">
                            Reminded
                          </span>
                        )}
                      </div>
                      {cart.userEmail && <p className="text-xs text-zinc-400 truncate">{cart.userEmail}</p>}
                      {cart.isGuest && cart.guestTrackId && (
                        <p className="text-[10px] text-zinc-600 mt-1">Session {cart.guestTrackId.slice(0, 8)}…</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">
                        Updated {new Date(cart.updatedAt).toLocaleString()} ({idleHours.toFixed(1)}h ago)
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-3xl font-bold text-[#00ff9d]">${cart.subtotal.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500">
                      {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'} · {cart.items.length}{' '}
                      {cart.items.length === 1 ? 'line' : 'lines'}
                    </p>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-zinc-800 px-5 py-4 bg-black/30">
                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Cart contents</p>
                    <div className="space-y-3">
                      {cart.items.map((item, index) => {
                        const options = formatCartItemOptions(item);
                        return (
                          <div
                            key={`${cart.ownerKey}-${item.id}-${index}`}
                            className="flex gap-4 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3"
                          >
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-14 h-14 object-cover rounded-lg border border-zinc-700 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-zinc-800 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              {options && <p className="text-xs text-zinc-400 mt-1">{options}</p>}
                              <p className="text-xs text-zinc-500 mt-1 capitalize">
                                {item.category || 'product'} · ID {item.id}
                                {item.isFirstOrderBonus ? ' · First-order bonus' : ''}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold">
                                {item.isFirstOrderBonus ? (
                                  <span className="text-[#00ff9d]">FREE</span>
                                ) : (
                                  `$${(item.price * item.quantity).toFixed(2)}`
                                )}
                              </p>
                              <p className="text-xs text-zinc-500">Qty {item.quantity}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}