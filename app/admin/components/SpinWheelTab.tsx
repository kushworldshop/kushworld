'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import type { SpinHistoryStats, SpinHistoryStatus } from '@/lib/spinWheelHistory';

interface SpinHistoryRow {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  spunAt: string;
  pointsSpent: number;
  segmentLabel: string;
  prizeLabel?: string;
  prizeId?: string;
  prizeType: string;
  instantBonusPoints?: number;
  expiresAt?: string;
  displayStatus: SpinHistoryStatus;
  statusAt?: string;
  orderId?: string;
  orderTotal?: number;
}

const STATUS_LABELS: Record<SpinHistoryStatus, string> = {
  no_prize: 'Try again',
  instant_points: 'Instant points',
  awaiting_accept: 'Awaiting accept',
  pending: 'Saved — not used yet',
  used: 'Used at checkout',
  forfeited: 'Forfeited',
  expired: 'Expired unused',
};

const STATUS_COLORS: Record<SpinHistoryStatus, string> = {
  no_prize: 'text-zinc-400',
  instant_points: 'text-blue-300',
  awaiting_accept: 'text-yellow-300',
  pending: 'text-amber-300',
  used: 'text-[#00ff9d]',
  forfeited: 'text-zinc-500',
  expired: 'text-red-400',
};

export default function SpinWheelTab() {
  const [entries, setEntries] = useState<SpinHistoryRow[]>([]);
  const [stats, setStats] = useState<SpinHistoryStats | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SpinHistoryStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [extendingId, setExtendingId] = useState<string | null>(null);

  const loadHistory = async (query = search, statusFilter = status, reconcile = false) => {
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams({
        q: query,
        status: statusFilter,
        limit: '300',
      });
      if (reconcile) params.set('reconcile', '1');

      const res = await adminFetch(`/api/admin/spin-history?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');

      setEntries(data.entries || []);
      setStats(data.stats || null);
      if (reconcile) {
        setMessage('Synced past wheel wins from orders and member accounts.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load wheel history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory('', 'all', true);
  }, []);

  const extendCoupon = async (prizeId: string, days: number) => {
    setExtendingId(prizeId);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/spin-history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prizeId, extendDays: days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend');
      setMessage(data.message || `Extended ${days} days`);
      await loadHistory(search, status);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to extend coupon');
    } finally {
      setExtendingId(null);
    }
  };

  return (
    <div className="mb-10">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Wheel Wins</h2>
            <p className="text-zinc-400 text-sm max-w-2xl">
              Track every spin — what members won, what is still waiting to be used, and what was claimed at checkout.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadHistory(search, status, true)}
              disabled={loading}
              className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Sync past data
            </button>
            <button
              onClick={() => loadHistory(search, status)}
              disabled={loading}
              className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {stats && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total spins" value={stats.totalSpins} />
            <StatCard label="Checkout prizes used" value={stats.used} accent />
            <StatCard label="Awaiting accept" value={stats.awaitingAccept} />
            <StatCard label="Saved coupons" value={stats.pending} />
            <StatCard label="Jackpots won" value={stats.jackpotsWon} highlight={stats.jackpotsWon > 0} />
            <StatCard label="Forfeited" value={stats.forfeited} />
            <StatCard label="Expired unused" value={stats.expired} />
            <StatCard label="Instant point wins" value={stats.instantPoints} />
            <StatCard label="Points spent on spins" value={stats.totalPointsSpent.toLocaleString()} />
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadHistory(search, status)}
            placeholder="Search email, name, prize, order..."
            className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SpinHistoryStatus | 'all')}
            className="bg-black border border-zinc-700 rounded-xl px-4 py-3"
          >
            <option value="all">All outcomes</option>
            <option value="used">Used at checkout</option>
            <option value="awaiting_accept">Awaiting accept</option>
            <option value="pending">Saved coupons</option>
            <option value="forfeited">Forfeited</option>
            <option value="expired">Expired</option>
            <option value="instant_points">Instant points</option>
            <option value="no_prize">Try again</option>
          </select>
          <button
            onClick={() => loadHistory(search, status)}
            className="bg-[#00ff9d] text-black px-6 py-3 rounded-xl font-medium"
          >
            Search
          </button>
        </div>

        {message && <p className="text-sm text-[#00ff9d] mb-4">{message}</p>}

        {loading ? (
          <p className="text-center py-16 text-zinc-400">Loading wheel history...</p>
        ) : entries.length === 0 ? (
          <p className="text-center py-16 text-zinc-500">No spins logged yet. New spins appear here automatically.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="pb-3 pr-4">When</th>
                  <th className="pb-3 pr-4">Member</th>
                  <th className="pb-3 pr-4">Result</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Claimed</th>
                  <th className="pb-3 pr-4">Extend</th>
                  <th className="pb-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-zinc-800/80 align-top">
                    <td className="py-4 pr-4 whitespace-nowrap text-zinc-400">
                      {new Date(entry.spunAt).toLocaleString()}
                    </td>
                    <td className="py-4 pr-4">
                      <p className="font-medium">{entry.userName}</p>
                      <p className="text-xs text-zinc-500">{entry.userEmail}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="font-medium">
                        {entry.prizeLabel || entry.segmentLabel}
                        {entry.prizeType === 'free_tshirt' && (
                          <span className="ml-2 text-pink-300 text-xs">Jackpot</span>
                        )}
                      </p>
                      {entry.instantBonusPoints ? (
                        <p className="text-xs text-blue-300">+{entry.instantBonusPoints} pts credited</p>
                      ) : entry.expiresAt && entry.displayStatus === 'pending' ? (
                        <p className="text-xs text-zinc-500">
                          Expires {new Date(entry.expiresAt).toLocaleDateString()}
                        </p>
                      ) : null}
                    </td>
                    <td className={`py-4 pr-4 ${STATUS_COLORS[entry.displayStatus]}`}>
                      {STATUS_LABELS[entry.displayStatus]}
                    </td>
                    <td className="py-4 pr-4">
                      {entry.orderId ? (
                        <div>
                          <p className="font-mono text-[#00ff9d]">#{entry.orderId}</p>
                          {entry.orderTotal !== undefined && (
                            <p className="text-xs text-zinc-500">${entry.orderTotal.toFixed(2)} order</p>
                          )}
                          {entry.statusAt && (
                            <p className="text-xs text-zinc-500">
                              {new Date(entry.statusAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : entry.displayStatus === 'pending' ? (
                        <span className="text-amber-300 text-xs">Not claimed yet</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      {entry.prizeId && entry.displayStatus === 'pending' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => extendCoupon(entry.prizeId!, 7)}
                            disabled={extendingId === entry.prizeId}
                            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            +7 days
                          </button>
                          <button
                            onClick={() => extendCoupon(entry.prizeId!, 14)}
                            disabled={extendingId === entry.prizeId}
                            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            +14 days
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-4 text-zinc-500">
                      {entry.pointsSpent > 0 ? `${entry.pointsSpent} pts` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="bg-black rounded-2xl p-5 border border-zinc-800">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
      <p
        className={`text-2xl font-bold ${
          highlight ? 'text-pink-300' : accent ? 'text-[#00ff9d]' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}