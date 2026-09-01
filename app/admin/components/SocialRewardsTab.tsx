'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';

interface SocialRewardSubmission {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  postUrl: string;
  postId: string;
  postAuthor?: string;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded: number;
  rejectReason?: string;
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
  submitIp?: string;
}

export default function SocialRewardsTab() {
  const [submissions, setSubmissions] = useState<SocialRewardSubmission[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [totalPointsAwarded, setTotalPointsAwarded] = useState(0);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async (status = filter) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await adminFetch(`/api/admin/social-rewards?status=${status}&limit=200`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setPendingCount(data.pendingCount ?? 0);
        setApprovedCount(data.approvedCount ?? 0);
        setRejectedCount(data.rejectedCount ?? 0);
        setTotalPointsAwarded(data.totalPointsAwarded ?? 0);
      }
    } catch {
      setMessage('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const review = async (submissionId: string, action: 'approve' | 'reject') => {
    let rejectReason: string | undefined;
    if (action === 'reject') {
      rejectReason =
        window.prompt('Rejection reason (shown to customer):', 'Does not meet haul post guidelines') ||
        undefined;
      if (rejectReason === undefined) return;
    }

    setBusyId(submissionId);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/social-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, action, rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Action failed');
        return;
      }
      setSubmissions(data.submissions || []);
      setPendingCount(data.pendingCount ?? 0);
      setApprovedCount(data.approvedCount ?? 0);
      setRejectedCount(data.rejectedCount ?? 0);
      setTotalPointsAwarded(data.totalPointsAwarded ?? 0);
      setMessage(action === 'approve' ? 'Approved and points awarded.' : 'Rejected.');
    } catch {
      setMessage('Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-10">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">X / Social Haul Rewards</h2>
            <p className="text-zinc-400 text-sm max-w-2xl">
              Customers paste haul post links from X. Review carefully before approving — each post can only be rewarded once, and points are paid on approval.
            </p>
          </div>
          <button
            onClick={() => load(filter)}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Pending</p>
            <p className="text-3xl font-bold text-amber-400">{pendingCount}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Approved</p>
            <p className="text-3xl font-bold text-[#00ff9d]">{approvedCount}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Rejected</p>
            <p className="text-3xl font-bold">{rejectedCount}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Points paid out</p>
            <p className="text-3xl font-bold">{totalPointsAwarded.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['pending', 'all', 'approved', 'rejected'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize ${
                filter === key ? 'bg-[#00ff9d] text-black' : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {message && (
          <p className="mt-4 text-sm text-zinc-300 bg-black/40 border border-zinc-800 rounded-xl px-4 py-3">
            {message}
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-center py-16 text-zinc-400">Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-12 text-center">
          <p className="text-xl text-zinc-400 mb-2">No submissions{filter !== 'all' ? ` (${filter})` : ''}</p>
          <p className="text-sm text-zinc-500">
            Customers submit X post links from Account → Loyalty.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((row) => (
            <div key={row.id} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="font-semibold">{row.userName || 'Customer'}</p>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        row.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : row.status === 'approved'
                            ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}
                    >
                      {row.status}
                    </span>
                    {row.pointsAwarded > 0 && (
                      <span className="text-xs text-[#00ff9d]">+{row.pointsAwarded} pts</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400">{row.userEmail}</p>
                  <a
                    href={row.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#00ff9d] hover:underline break-all mt-2 inline-block"
                  >
                    {row.postUrl}
                  </a>
                  <p className="text-xs text-zinc-500 mt-2">
                    Submitted {new Date(row.createdAt).toLocaleString()}
                    {row.postAuthor ? ` · @${row.postAuthor}` : ''}
                    {row.submitIp ? ` · IP ${row.submitIp}` : ''}
                  </p>
                  {row.adminNote && (
                    <p className="text-xs text-amber-400/90 mt-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                      ⚠ {row.adminNote}
                    </p>
                  )}
                  {row.rejectReason && (
                    <p className="text-xs text-red-400 mt-2">Rejected: {row.rejectReason}</p>
                  )}
                </div>

                {row.status === 'pending' && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => review(row.id, 'approve')}
                      className="bg-[#00ff9d] text-black px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                    >
                      {busyId === row.id ? '…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => review(row.id, 'reject')}
                      className="bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TdPostsAdmin />
    </div>
  );
}

interface TdRow {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  postUrl: string;
  platform: string;
  status: 'credited' | 'used' | 'traded' | 'revoked';
  createdAt: string;
  revokeReason?: string;
}

function TdPostsAdmin() {
  const [rows, setRows] = useState<TdRow[]>([]);
  const [creditedCount, setCreditedCount] = useState(0);
  const [usedCount, setUsedCount] = useState(0);
  const [tradedCount, setTradedCount] = useState(0);
  const [revokedCount, setRevokedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/td-rewards?limit=200');
      const data = await res.json();
      if (res.ok) {
        setRows(data.submissions || []);
        setCreditedCount(data.creditedCount ?? 0);
        setUsedCount(data.usedCount ?? 0);
        setTradedCount(data.tradedCount ?? 0);
        setRevokedCount(data.revokedCount ?? 0);
      }
    } catch {
      setMessage('Failed to load TD posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const revoke = async (row: TdRow) => {
    if (row.status !== 'credited') return;
    const reason = window.prompt('Revoke unused $5 TD credit? Reason (optional):', '') ?? undefined;
    if (reason === undefined) return;
    setBusyId(row.id);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/td-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: row.id, action: 'revoke', reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Revoke failed');
        return;
      }
      setRows(data.submissions || []);
      setCreditedCount(data.creditedCount ?? 0);
      setUsedCount(data.usedCount ?? 0);
      setTradedCount(data.tradedCount ?? 0);
      setRevokedCount(data.revokedCount ?? 0);
      setMessage('Unused $5 TD credit revoked.');
    } catch {
      setMessage('Revoke failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-12">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">TouchDown / TD posts</h2>
            <p className="text-zinc-400 text-sm max-w-2xl">
              Members paste a pack-landing post from their account. A $5 coupon is applied automatically (one unused credit, no stacking). You can revoke unused credits here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Unused credits</p>
            <p className="text-3xl font-bold text-[#00ff9d]">{creditedCount}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Used at checkout</p>
            <p className="text-3xl font-bold">{usedCount}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Traded for spins</p>
            <p className="text-3xl font-bold text-sky-400">{tradedCount}</p>
          </div>
          <div className="bg-black rounded-2xl p-5 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Revoked</p>
            <p className="text-3xl font-bold text-red-400">{revokedCount}</p>
          </div>
        </div>
        {message && (
          <p className="mt-4 text-sm text-zinc-300 bg-black/40 border border-zinc-800 rounded-xl px-4 py-3">{message}</p>
        )}
      </div>

      {loading ? (
        <p className="text-center py-10 text-zinc-400">Loading TD posts...</p>
      ) : rows.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-12 text-center">
          <p className="text-xl text-zinc-400 mb-2">No TouchDown posts yet</p>
          <p className="text-sm text-zinc-500">Members submit from Account → Profile or Loyalty.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="font-semibold">{row.userName || 'Customer'}</p>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400">
                      {row.status}
                    </span>
                    <span className="text-xs text-zinc-500">{row.platform}</span>
                  </div>
                  <p className="text-sm text-zinc-400">{row.userEmail}</p>
                  <a
                    href={row.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#00ff9d] hover:underline break-all mt-2 inline-block"
                  >
                    {row.postUrl}
                  </a>
                  <p className="text-xs text-zinc-500 mt-2">
                    Submitted {new Date(row.createdAt).toLocaleString()}
                  </p>
                  {row.revokeReason && <p className="text-xs text-red-400 mt-2">{row.revokeReason}</p>}
                </div>
                {row.status === 'credited' && (
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void revoke(row)}
                    className="bg-red-900/60 hover:bg-red-900 px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 shrink-0"
                  >
                    {busyId === row.id ? '…' : 'Revoke $5'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}