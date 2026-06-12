'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
  loyaltyPoints: number;
  lockedLoyaltyPoints: number;
  idVerified?: boolean;
  signupBonusClaimed?: boolean;
  bio?: string;
  avatarUrl?: string;
  promoCode?: string;
  commissionPercent?: number;
  commissionPercentOverride?: number | null;
  defaultCommissionPercent?: number;
  commissionEarned?: number;
  promoConversions?: number;
  promoClicks?: number;
}

type CustomerDraft = {
  name: string;
  phone: string;
  bio: string;
  avatarUrl: string;
  loyaltyPoints: number;
  lockedLoyaltyPoints: number;
  idVerified: boolean;
  signupBonusClaimed: boolean;
  useDefaultCommission: boolean;
  commissionPercent: string;
};

export default function CustomersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<CustomerDraft>>>({});

  const loadUsers = async (query = search) => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      setMessage('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const getDraft = (user: AdminUser): CustomerDraft => {
    const hasOverride =
      edits[user.id]?.useDefaultCommission !== undefined
        ? !edits[user.id]?.useDefaultCommission
        : user.commissionPercentOverride !== null && user.commissionPercentOverride !== undefined;

    const commissionValue =
      edits[user.id]?.commissionPercent !== undefined
        ? edits[user.id]!.commissionPercent!
        : hasOverride
          ? String(user.commissionPercentOverride)
          : String(user.defaultCommissionPercent ?? 5);

    return {
      name: edits[user.id]?.name ?? user.name,
      phone: edits[user.id]?.phone ?? user.phone ?? '',
      bio: edits[user.id]?.bio ?? user.bio ?? '',
      avatarUrl: edits[user.id]?.avatarUrl ?? user.avatarUrl ?? '',
      loyaltyPoints: edits[user.id]?.loyaltyPoints ?? user.loyaltyPoints,
      lockedLoyaltyPoints: edits[user.id]?.lockedLoyaltyPoints ?? user.lockedLoyaltyPoints,
      idVerified: edits[user.id]?.idVerified ?? user.idVerified ?? false,
      signupBonusClaimed: edits[user.id]?.signupBonusClaimed ?? user.signupBonusClaimed ?? false,
      useDefaultCommission: edits[user.id]?.useDefaultCommission ?? !hasOverride,
      commissionPercent: commissionValue,
    };
  };

  const updateDraft = (id: string, patch: Partial<CustomerDraft>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const saveUser = async (user: AdminUser) => {
    const draft = getDraft(user);
    setSavingId(user.id);
    setMessage('');

    const payload: Record<string, unknown> = {
      id: user.id,
      name: draft.name,
      phone: draft.phone,
      bio: draft.bio,
      avatarUrl: draft.avatarUrl,
      loyaltyPoints: draft.loyaltyPoints,
      lockedLoyaltyPoints: draft.lockedLoyaltyPoints,
      idVerified: draft.idVerified,
      signupBonusClaimed: draft.signupBonusClaimed,
    };

    if (user.promoCode) {
      payload.commissionPercent = draft.useDefaultCommission ? null : Number(draft.commissionPercent);
    }

    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setUsers((prev) => prev.map((item) => (item.id === user.id ? data.user : item)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      setMessage(`Saved ${user.email}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save customer');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="mb-10">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <h2 className="text-2xl font-bold mb-2">Customers</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Edit customer profiles, loyalty points, and commission rate per promo code. Passwords are never shown.
        </p>
        <div className="flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or promo code..."
            className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
          <button onClick={() => loadUsers(search)} className="px-6 py-3 bg-zinc-800 rounded-xl">
            Search
          </button>
        </div>
        {message && <p className="text-sm text-[#00ff9d] mt-4">{message}</p>}
      </div>

      {loading ? (
        <p className="text-center py-20 text-zinc-400">Loading customers...</p>
      ) : users.length === 0 ? (
        <p className="text-center py-20 text-zinc-400">No customers found.</p>
      ) : (
        <div className="space-y-6">
          {users.map((user) => {
            const draft = getDraft(user);
            return (
              <div key={user.id} className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
                <div className="flex flex-wrap justify-between gap-4 mb-4">
                  <div>
                    <p className="font-bold text-lg">{user.email}</p>
                    <p className="text-sm text-zinc-500">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => saveUser(user)}
                    disabled={savingId === user.id}
                    className="bg-[#00ff9d] text-black px-6 py-3 rounded-xl font-bold disabled:opacity-50"
                  >
                    {savingId === user.id ? 'Saving...' : 'Save Customer'}
                  </button>
                </div>

                {user.promoCode && (
                  <div className="bg-black/50 border border-zinc-800 rounded-2xl p-5 mb-5">
                    <h3 className="font-semibold mb-3 text-[#00ff9d]">Promo Code</h3>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm text-zinc-400 block mb-1">Code</label>
                        <input
                          value={user.promoCode}
                          readOnly
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-300"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-zinc-400 block mb-1">Commission %</label>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          step={0.5}
                          disabled={draft.useDefaultCommission}
                          value={draft.commissionPercent}
                          onChange={(e) => updateDraft(user.id, { commissionPercent: e.target.value })}
                          className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 disabled:opacity-50"
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                          Site default: {user.defaultCommissionPercent ?? 5}%
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm mb-3">
                      <input
                        type="checkbox"
                        checked={draft.useDefaultCommission}
                        onChange={(e) =>
                          updateDraft(user.id, {
                            useDefaultCommission: e.target.checked,
                            commissionPercent: e.target.checked
                              ? String(user.defaultCommissionPercent ?? 5)
                              : draft.commissionPercent,
                          })
                        }
                        className="accent-[#00ff9d]"
                      />
                      Use site default commission ({user.defaultCommissionPercent ?? 5}%)
                    </label>
                    <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
                      <span>{user.promoClicks ?? 0} clicks</span>
                      <span>{user.promoConversions ?? 0} orders</span>
                      <span>${(user.commissionEarned ?? 0).toFixed(2)} earned</span>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-zinc-400 block mb-1">Name</label>
                    <input
                      value={draft.name}
                      onChange={(e) => updateDraft(user.id, { name: e.target.value })}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 block mb-1">Phone</label>
                    <input
                      value={draft.phone}
                      onChange={(e) => updateDraft(user.id, { phone: e.target.value })}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 block mb-1">Loyalty points</label>
                    <input
                      type="number"
                      value={draft.loyaltyPoints}
                      onChange={(e) => updateDraft(user.id, { loyaltyPoints: Number(e.target.value) })}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 block mb-1">Locked points</label>
                    <input
                      type="number"
                      value={draft.lockedLoyaltyPoints}
                      onChange={(e) => updateDraft(user.id, { lockedLoyaltyPoints: Number(e.target.value) })}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-zinc-400 block mb-1">Bio</label>
                    <textarea
                      value={draft.bio}
                      onChange={(e) => updateDraft(user.id, { bio: e.target.value })}
                      rows={2}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-zinc-400 block mb-1">Avatar URL</label>
                    <input
                      value={draft.avatarUrl}
                      onChange={(e) => updateDraft(user.id, { avatarUrl: e.target.value })}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 mt-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.idVerified}
                      onChange={(e) => updateDraft(user.id, { idVerified: e.target.checked })}
                      className="accent-[#00ff9d]"
                    />
                    ID verified (21+)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.signupBonusClaimed}
                      onChange={(e) => updateDraft(user.id, { signupBonusClaimed: e.target.checked })}
                      className="accent-[#00ff9d]"
                    />
                    Signup bonus claimed
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}