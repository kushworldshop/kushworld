'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import GrokChat from '@/app/components/GrokChat';
import type { UserSocials } from '@/lib/users';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
  loyaltyPoints: number;
  lockedLoyaltyPoints: number;
  redeemableLoyaltyPoints: number;
  idVerified?: boolean;
  signupBonusClaimed?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  idVerification?: {
    status: 'none' | 'uploaded' | 'verified' | 'rejected';
    uploadedAt?: string;
    verifiedAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    autoRejected?: boolean;
  };
  orderCount: number;
  blocked?: boolean;
  blockedAt?: string;
  blockReason?: string;
  bio?: string;
  avatarUrl?: string;
  socials?: UserSocials;
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  promoCode?: string;
  referralLink?: string;
  commissionPercent?: number;
  commissionPercentOverride?: number | null;
  defaultCommissionPercent?: number;
  referrerRewardPoints?: number;
  referrerRewardPointsOverride?: number | null;
  defaultReferrerRewardPoints?: number;
  commissionEarned?: number;
  pointsEarnedFromReferrals?: number;
  pointsClaimedFromReferrals?: number;
  promoConversions?: number;
  promoClicks?: number;
}

type MemberDraft = {
  name: string;
  phone: string;
  bio: string;
  avatarUrl: string;
  socials: UserSocials;
  promoCode: string;
  loyaltyPoints: number;
  lockedLoyaltyPoints: number;
  idVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  signupBonusClaimed: boolean;
  blocked: boolean;
  blockReason: string;
  useDefaultCommission: boolean;
  commissionPercent: string;
  useDefaultRewardPoints: boolean;
  referrerRewardPoints: string;
};

const emptySocials: UserSocials = {
  instagram: '',
  twitter: '',
  tiktok: '',
  youtube: '',
  website: '',
};

export default function CustomersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<MemberDraft>>>({});

  const loadUsers = async (query = search) => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const nextUsers = data.users || [];
        setUsers(nextUsers);
        if (nextUsers.length > 0 && !nextUsers.some((user: AdminUser) => user.id === selectedId)) {
          setSelectedId(nextUsers[0].id);
        }
      }
    } catch {
      setMessage('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedId) ?? null,
    [users, selectedId]
  );

  const getDraft = (user: AdminUser): MemberDraft => {
    const patch = edits[user.id];
    const hasCommissionOverride =
      patch?.useDefaultCommission !== undefined
        ? !patch.useDefaultCommission
        : user.commissionPercentOverride !== null && user.commissionPercentOverride !== undefined;
    const hasRewardOverride =
      patch?.useDefaultRewardPoints !== undefined
        ? !patch.useDefaultRewardPoints
        : user.referrerRewardPointsOverride !== null && user.referrerRewardPointsOverride !== undefined;

    return {
      name: patch?.name ?? user.name,
      phone: patch?.phone ?? user.phone ?? '',
      bio: patch?.bio ?? user.bio ?? '',
      avatarUrl: patch?.avatarUrl ?? user.avatarUrl ?? '',
      socials: { ...emptySocials, ...user.socials, ...patch?.socials },
      promoCode: patch?.promoCode ?? user.promoCode ?? '',
      loyaltyPoints: patch?.loyaltyPoints ?? user.loyaltyPoints,
      lockedLoyaltyPoints: patch?.lockedLoyaltyPoints ?? user.lockedLoyaltyPoints,
      idVerified: patch?.idVerified ?? user.idVerified ?? false,
      emailVerified: patch?.emailVerified ?? user.emailVerified ?? false,
      phoneVerified: patch?.phoneVerified ?? user.phoneVerified ?? false,
      signupBonusClaimed: patch?.signupBonusClaimed ?? user.signupBonusClaimed ?? false,
      blocked: patch?.blocked ?? user.blocked ?? false,
      blockReason: patch?.blockReason ?? user.blockReason ?? '',
      useDefaultCommission: patch?.useDefaultCommission ?? !hasCommissionOverride,
      commissionPercent:
        patch?.commissionPercent !== undefined
          ? patch.commissionPercent
          : hasCommissionOverride
            ? String(user.commissionPercentOverride)
            : String(user.defaultCommissionPercent ?? 5),
      useDefaultRewardPoints: patch?.useDefaultRewardPoints ?? !hasRewardOverride,
      referrerRewardPoints:
        patch?.referrerRewardPoints !== undefined
          ? patch.referrerRewardPoints
          : hasRewardOverride
            ? String(user.referrerRewardPointsOverride)
            : String(user.defaultReferrerRewardPoints ?? 100),
    };
  };

  const updateDraft = (id: string, patch: Partial<MemberDraft>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const adjustPoints = (user: AdminUser, delta: number) => {
    const draft = getDraft(user);
    updateDraft(user.id, {
      loyaltyPoints: Math.max(0, draft.loyaltyPoints + delta),
    });
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
      socials: draft.socials,
      loyaltyPoints: draft.loyaltyPoints,
      lockedLoyaltyPoints: draft.lockedLoyaltyPoints,
      idVerified: draft.idVerified,
      emailVerified: draft.emailVerified,
      phoneVerified: draft.phoneVerified,
      signupBonusClaimed: draft.signupBonusClaimed,
      blocked: draft.blocked,
      blockReason: draft.blockReason,
      commissionPercent: draft.useDefaultCommission ? null : Number(draft.commissionPercent),
      referrerRewardPoints: draft.useDefaultRewardPoints ? null : Number(draft.referrerRewardPoints),
    };

    const normalizedPromo = draft.promoCode.trim().toUpperCase();
    if (normalizedPromo && normalizedPromo !== (user.promoCode || '').toUpperCase()) {
      payload.promoCode = normalizedPromo;
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
      setMessage(error instanceof Error ? error.message : 'Failed to save member');
    } finally {
      setSavingId(null);
    }
  };

  const viewUserId = async (userId: string) => {
    try {
      const res = await adminFetch(`/api/admin/id-image?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        setMessage('No ID image on file for this member');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      setMessage('Failed to load ID image');
    }
  };

  const updateIdVerification = async (
    user: AdminUser,
    action: 'verify' | 'reject',
    idRejectionReason?: string
  ) => {
    setSavingId(user.id);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          idVerificationAction: action,
          idRejectionReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setUsers((prev) => prev.map((item) => (item.id === user.id ? data.user : item)));
      setMessage(
        action === 'verify'
          ? `ID verified for ${user.email}`
          : `ID rejected for ${user.email}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update ID status');
    } finally {
      setSavingId(null);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    const confirmed = window.confirm(
      `Delete ${user.email} permanently?\n\nThis removes their account, login access, and loyalty balance. Order history is kept.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    setMessage('');

    try {
      const res = await adminFetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');

      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      setSelectedId((current) => (current === user.id ? null : current));
      setMessage(data.message || `Deleted ${user.email}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to delete member');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mb-10">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <h2 className="text-2xl font-bold mb-2">Site Members</h2>
        <p className="text-zinc-400 text-sm">
          View every registered member, edit profiles and social links, and manage loyalty points and
          commission settings per person.
        </p>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 min-h-[640px]">
        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 flex flex-col">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUsers(search)}
            placeholder="Search name, email, phone, promo..."
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 mb-3"
          />
          <button onClick={() => loadUsers(search)} className="w-full px-4 py-2 bg-zinc-800 rounded-xl text-sm mb-4">
            Search
          </button>
          <p className="text-xs text-zinc-500 mb-3 px-1">
            {loading ? 'Loading...' : `${users.length} member${users.length === 1 ? '' : 's'}`}
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {users.map((user) => {
              const active = user.id === selectedId;
              return (
                <button
                  key={user.id}
                  onClick={() => setSelectedId(user.id)}
                  className={`w-full text-left rounded-2xl px-4 py-3 border transition ${
                    active
                      ? user.blocked
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-[#00ff9d] bg-[#00ff9d]/10'
                      : user.blocked
                        ? 'border-red-900 bg-red-950/30 hover:border-red-700'
                        : 'border-zinc-800 bg-black/40 hover:border-zinc-600'
                  }`}
                >
                  <p className="font-medium truncate">{user.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-zinc-400">
                    <span>{user.loyaltyPoints.toLocaleString()} pts</span>
                    <span>{user.orderCount} orders</span>
                    {user.blocked && <span className="text-red-400">Blocked</span>}
                    {user.idVerification?.status === 'uploaded' && (
                      <span className="text-yellow-400">ID pending</span>
                    )}
                    {user.promoCode && <span className="text-[#00ff9d]">{user.promoCode}</span>}
                  </div>
                </button>
              );
            })}
            {!loading && users.length === 0 && (
              <p className="text-center text-zinc-500 text-sm py-10">No members found.</p>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 lg:p-8">
          {!selectedUser ? (
            <div className="h-full flex items-center justify-center text-zinc-500">
              Select a member to view their profile
            </div>
          ) : (
            <MemberProfilePanel
              user={selectedUser}
              draft={getDraft(selectedUser)}
              saving={savingId === selectedUser.id}
              deleting={deletingId === selectedUser.id}
              message={message}
              onDraftChange={(patch) => updateDraft(selectedUser.id, patch)}
              onAdjustPoints={(delta) => adjustPoints(selectedUser, delta)}
              onSave={() => saveUser(selectedUser)}
              onDelete={() => deleteUser(selectedUser)}
              onViewId={() => viewUserId(selectedUser.id)}
              onVerifyId={() => updateIdVerification(selectedUser, 'verify')}
              onRejectId={(reason) => updateIdVerification(selectedUser, 'reject', reason)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function MemberProfilePanel({
  user,
  draft,
  saving,
  deleting,
  message,
  onDraftChange,
  onAdjustPoints,
  onSave,
  onDelete,
  onViewId,
  onVerifyId,
  onRejectId,
}: {
  user: AdminUser;
  draft: MemberDraft;
  saving: boolean;
  deleting: boolean;
  message: string;
  onDraftChange: (patch: Partial<MemberDraft>) => void;
  onAdjustPoints: (delta: number) => void;
  onSave: () => void;
  onDelete: () => void;
  onViewId: () => void;
  onVerifyId: () => void;
  onRejectId: (reason: string) => void;
}) {
  const redeemable = Math.max(0, draft.loyaltyPoints - draft.lockedLoyaltyPoints);
  const idStatus = user.idVerification?.status ?? (user.idVerified ? 'verified' : 'none');
  const [rejectReason, setRejectReason] = useState('');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between gap-4 items-start">
        <div>
          <h3 className="text-2xl font-bold">{user.name}</h3>
          <p className="text-zinc-400">{user.email}</p>
          <p className="text-sm text-zinc-500 mt-1">
            Joined {new Date(user.createdAt).toLocaleDateString()} · {user.orderCount} order
            {user.orderCount === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap gap-2 mt-3 text-xs">
            {user.emailVerified && <Badge label="Email verified" tone="green" />}
            {user.phoneVerified && <Badge label="Phone verified" tone="green" />}
            {user.idVerified && <Badge label="ID verified" tone="green" />}
            {user.signupBonusClaimed && <Badge label="Signup bonus" tone="amber" />}
            {draft.blocked && <Badge label="Blocked" tone="red" />}
            {idStatus === 'verified' && <Badge label="ID verified" tone="green" />}
            {idStatus === 'uploaded' && <Badge label="ID pending" tone="amber" />}
            {idStatus === 'rejected' && (
              <Badge
                label={user.idVerification?.autoRejected ? 'ID auto-rejected' : 'ID rejected'}
                tone="red"
              />
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onSave}
            disabled={saving || deleting}
            className="bg-[#00ff9d] text-black px-6 py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <button
            onClick={onDelete}
            disabled={saving || deleting}
            className="bg-red-950 border border-red-800 text-red-300 px-6 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-red-900"
          >
            {deleting ? 'Deleting...' : 'Delete Member'}
          </button>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'text-red-400' : 'text-[#00ff9d]'}`}>
          {message}
        </p>
      )}

      <section className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5">
        <SectionTitle>ID Verification</SectionTitle>
        <p className="text-sm text-zinc-500 mb-4">
          Members can pre-upload ID photos from their account. Review here before approving hemp checkout access.
        </p>
        <p className="text-sm mb-4">
          Status:{' '}
          <span
            className={
              idStatus === 'verified'
                ? 'text-green-400'
                : idStatus === 'uploaded'
                  ? 'text-yellow-400'
                  : idStatus === 'rejected'
                    ? 'text-red-400'
                    : 'text-zinc-400'
            }
          >
            {idStatus}
          </span>
          {user.idVerification?.uploadedAt && idStatus !== 'none' && (
            <span className="text-xs text-zinc-500 block mt-1">
              Uploaded {new Date(user.idVerification.uploadedAt).toLocaleString()}
            </span>
          )}
          {user.idVerification?.rejectionReason && (
            <span className="text-xs text-red-400 block mt-1">
              Rejection reason: {user.idVerification.rejectionReason}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={onViewId}
            disabled={idStatus === 'none' || saving || deleting}
            className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl disabled:opacity-40"
          >
            View ID Photo
          </button>
          <button
            type="button"
            onClick={onVerifyId}
            disabled={saving || deleting || idStatus === 'verified'}
            className="text-sm bg-green-900/50 border border-green-800 text-green-300 px-4 py-2 rounded-xl disabled:opacity-40"
          >
            Approve ID
          </button>
        </div>
        <GrokChat
          useAdminAuth
          mode="admin"
          adminTask="ID verification and member support"
          adminContext={{
            memberName: user.name,
            email: user.email,
            phone: user.phone,
            idStatus,
            idRejectionReason: user.idVerification?.rejectionReason,
            autoRejected: user.idVerification?.autoRejected,
            orders: user.orderCount,
            loyaltyPoints: draft.loyaltyPoints,
            emailVerified: draft.emailVerified,
            phoneVerified: draft.phoneVerified,
          }}
          title="Grok Admin Assist"
          subtitle="Draft rejection messages or get a quick member summary."
          placeholder="Draft a polite ID rejection because the photo is blurry..."
          suggestedPrompts={[
            'Summarize this member in 3 bullets',
            'Draft ID rejection — photo is too blurry',
            'Draft ID rejection — not a government ID',
          ]}
          onContentGenerated={(text) => setRejectReason(text)}
        />

        <div className="flex flex-wrap gap-2 items-end mt-4">
          <div className="flex-1 min-w-[200px]">
            <Field
              label="Rejection reason (optional)"
              value={rejectReason}
              onChange={setRejectReason}
              placeholder="Blurry photo, expired ID, etc."
            />
          </div>
          <button
            type="button"
            onClick={() => onRejectId(rejectReason)}
            disabled={saving || deleting || idStatus === 'none'}
            className="text-sm bg-red-950 border border-red-800 text-red-300 px-4 py-2 rounded-xl disabled:opacity-40 mb-1"
          >
            Reject ID
          </button>
        </div>
      </section>

      <section className="bg-red-950/20 border border-red-900/50 rounded-2xl p-5">
        <SectionTitle>Access Control</SectionTitle>
        <p className="text-sm text-zinc-500 mb-4">
          Blocked members cannot log in or use account features. Their session is invalidated immediately after you save.
        </p>
        <Checkbox
          label="Block site access"
          checked={draft.blocked}
          onChange={(v) => onDraftChange({ blocked: v })}
        />
        {draft.blocked && (
          <div className="mt-4">
            <Field
              label="Block reason (optional — shown to member at login)"
              value={draft.blockReason}
              onChange={(v) => onDraftChange({ blockReason: v })}
              placeholder="Policy violation, chargeback, etc."
            />
            {user.blockedAt && (
              <p className="text-xs text-zinc-500 mt-2">
                Blocked since {new Date(user.blockedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Basic Info</SectionTitle>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Display name" value={draft.name} onChange={(v) => onDraftChange({ name: v })} />
          <Field label="Phone" value={draft.phone} onChange={(v) => onDraftChange({ phone: v })} />
          <div className="md:col-span-2">
            <Field label="Bio" value={draft.bio} onChange={(v) => onDraftChange({ bio: v })} multiline />
          </div>
          <div className="md:col-span-2">
            <Field label="Avatar URL" value={draft.avatarUrl} onChange={(v) => onDraftChange({ avatarUrl: v })} />
          </div>
        </div>
        {user.shippingAddress && (
          <p className="text-sm text-zinc-500 mt-3">
            Shipping: {user.shippingAddress.address}, {user.shippingAddress.city}{' '}
            {user.shippingAddress.state} {user.shippingAddress.zip}
          </p>
        )}
        <div className="flex flex-wrap gap-6 mt-4 text-sm">
          <Checkbox
            label="Email verified"
            checked={draft.emailVerified}
            onChange={(v) => onDraftChange({ emailVerified: v })}
          />
          <Checkbox
            label="Phone verified"
            checked={draft.phoneVerified}
            onChange={(v) => onDraftChange({ phoneVerified: v })}
          />
          <Checkbox
            label="ID verified (21+)"
            checked={draft.idVerified}
            onChange={(v) => onDraftChange({ idVerified: v })}
          />
          <Checkbox
            label="Signup bonus claimed"
            checked={draft.signupBonusClaimed}
            onChange={(v) => onDraftChange({ signupBonusClaimed: v })}
          />
        </div>
      </section>

      <section>
        <SectionTitle>Social Links</SectionTitle>
        <p className="text-sm text-zinc-500 mb-4">
          Members can also edit these on their account page. Handles or full URLs both work.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <Field
            label="Instagram"
            value={draft.socials.instagram || ''}
            onChange={(v) => onDraftChange({ socials: { ...draft.socials, instagram: v } })}
            placeholder="@handle"
          />
          <Field
            label="X / Twitter"
            value={draft.socials.twitter || ''}
            onChange={(v) => onDraftChange({ socials: { ...draft.socials, twitter: v } })}
            placeholder="@handle"
          />
          <Field
            label="TikTok"
            value={draft.socials.tiktok || ''}
            onChange={(v) => onDraftChange({ socials: { ...draft.socials, tiktok: v } })}
            placeholder="@handle"
          />
          <Field
            label="YouTube"
            value={draft.socials.youtube || ''}
            onChange={(v) => onDraftChange({ socials: { ...draft.socials, youtube: v } })}
            placeholder="Channel URL"
          />
          <div className="md:col-span-2">
            <Field
              label="Website"
              value={draft.socials.website || ''}
              onChange={(v) => onDraftChange({ socials: { ...draft.socials, website: v } })}
              placeholder="https://..."
            />
          </div>
        </div>
      </section>

      <section className="bg-black/40 border border-zinc-800 rounded-2xl p-5">
        <SectionTitle>Loyalty Points</SectionTitle>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <Stat label="Total points" value={draft.loyaltyPoints.toLocaleString()} accent />
          <Stat label="Locked" value={draft.lockedLoyaltyPoints.toLocaleString()} />
          <Stat label="Redeemable" value={redeemable.toLocaleString()} accent />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <Field
            label="Total loyalty points"
            type="number"
            value={String(draft.loyaltyPoints)}
            onChange={(v) => onDraftChange({ loyaltyPoints: Math.max(0, Number(v) || 0) })}
          />
          <Field
            label="Locked points"
            type="number"
            value={String(draft.lockedLoyaltyPoints)}
            onChange={(v) => onDraftChange({ lockedLoyaltyPoints: Math.max(0, Number(v) || 0) })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[100, 500, 1000, -100, -500].map((delta) => (
            <button
              key={delta}
              onClick={() => onAdjustPoints(delta)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm"
            >
              {delta > 0 ? `+${delta}` : delta} pts
            </button>
          ))}
        </div>
        {(user.pointsEarnedFromReferrals ?? 0) > 0 && (
          <p className="text-xs text-zinc-500 mt-4">
            Referral points earned: {user.pointsEarnedFromReferrals?.toLocaleString()} · claimed:{' '}
            {user.pointsClaimedFromReferrals?.toLocaleString()}
          </p>
        )}
      </section>

      <section className="bg-black/40 border border-zinc-800 rounded-2xl p-5">
        <SectionTitle>Promo Code & Commission</SectionTitle>
        <p className="text-sm text-zinc-500 mb-4">
          Members can also set their own code on their account page. Edit it here anytime.
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Promo code</label>
            <input
              value={draft.promoCode}
              onChange={(e) => onDraftChange({ promoCode: e.target.value.toUpperCase() })}
              placeholder="MEMBER-CODE"
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-[#00ff9d] font-mono uppercase"
            />
            <p className="text-xs text-zinc-500 mt-1">4–20 characters. Letters, numbers, and hyphens only.</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Referral link</label>
            <input
              value={
                draft.promoCode.trim()
                  ? `https://kushworld.shop/ref/${draft.promoCode.trim().toUpperCase()}`
                  : user.referralLink || ''
              }
              readOnly
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-xs text-zinc-400"
            />
          </div>
        </div>

        {draft.promoCode.trim() ? (
          <>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Commission %</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  disabled={draft.useDefaultCommission}
                  value={draft.commissionPercent}
                  onChange={(e) => onDraftChange({ commissionPercent: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 disabled:opacity-50"
                />
                <Checkbox
                  label={`Use site default (${user.defaultCommissionPercent ?? 5}%)`}
                  checked={draft.useDefaultCommission}
                  onChange={(checked) =>
                    onDraftChange({
                      useDefaultCommission: checked,
                      commissionPercent: checked
                        ? String(user.defaultCommissionPercent ?? 5)
                        : draft.commissionPercent,
                    })
                  }
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Points per promo use</label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  disabled={draft.useDefaultRewardPoints}
                  value={draft.referrerRewardPoints}
                  onChange={(e) => onDraftChange({ referrerRewardPoints: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 disabled:opacity-50"
                />
                <Checkbox
                  label={`Use site default (${user.defaultReferrerRewardPoints ?? 100} pts)`}
                  checked={draft.useDefaultRewardPoints}
                  onChange={(checked) =>
                    onDraftChange({
                      useDefaultRewardPoints: checked,
                      referrerRewardPoints: checked
                        ? String(user.defaultReferrerRewardPoints ?? 100)
                        : draft.referrerRewardPoints,
                    })
                  }
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
              <span>{user.promoClicks ?? 0} link clicks</span>
              <span>{user.promoConversions ?? 0} orders</span>
              <span className="text-[#00ff9d]">${(user.commissionEarned ?? 0).toFixed(2)} commission earned</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Enter a promo code above and save to activate this member&apos;s referral link.
          </p>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-lg font-semibold text-[#00ff9d] mb-4">{children}</h4>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const className = 'w-full bg-black border border-zinc-700 rounded-xl px-4 py-3';
  return (
    <div>
      <label className="text-sm text-zinc-400 block mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={className}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
  className = '',
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label className={`flex items-center gap-2 text-sm cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[#00ff9d]"
      />
      {label}
    </label>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-[#00ff9d]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: 'green' | 'amber' | 'red' }) {
  const colors =
    tone === 'green'
      ? 'text-green-400 border-green-800'
      : tone === 'red'
        ? 'text-red-400 border-red-800'
        : 'text-amber-400 border-amber-800';
  return <span className={`px-2 py-1 rounded-full border text-xs ${colors}`}>{label}</span>;
}