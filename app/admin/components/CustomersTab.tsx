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
  freeEighthReceivedAt?: string;
  freeEighthOrderId?: string;
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
  const [showFree8thOnly, setShowFree8thOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<MemberDraft>>>({});

  // Per-client orders and manual add order for this profile
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingUserOrders, setLoadingUserOrders] = useState(false);
  const [showAddOrderForm, setShowAddOrderForm] = useState(false);
  const [addOrderItems, setAddOrderItems] = useState<any[]>([{ name: '', quantity: 1, price: 0 }]);
  const [addOrderStatus, setAddOrderStatus] = useState('confirmed');
  const [addOrderTrackingNumber, setAddOrderTrackingNumber] = useState('');
  const [addOrderTrackingCarrier, setAddOrderTrackingCarrier] = useState('usps');
  const [addOrderFreeEighth, setAddOrderFreeEighth] = useState(false);
  const [addingOrder, setAddingOrder] = useState(false);

  const displayUsers = showFree8thOnly ? users.filter((u) => !!u.freeEighthReceivedAt) : users;

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

  const loadUserOrders = async (email: string) => {
    setLoadingUserOrders(true);
    try {
      const res = await adminFetch('/api/orders');
      if (res.ok) {
        const allOrders = await res.json();
        const filtered = (Array.isArray(allOrders) ? allOrders : []).filter((o: any) => {
          const oEmail = (o.email || o.customer?.email || '').toLowerCase();
          return oEmail === email.toLowerCase();
        });
        setUserOrders(filtered);
      }
    } catch {
      setUserOrders([]);
    } finally {
      setLoadingUserOrders(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedId) ?? null,
    [users, selectedId]
  );

  useEffect(() => {
    if (selectedUser?.email) {
      loadUserOrders(selectedUser.email);
    } else {
      setUserOrders([]);
      setShowAddOrderForm(false);
    }
  }, [selectedUser]);

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

  const unlockUserPoints = async (user: AdminUser, amount?: number) => {
    const locked = user.lockedLoyaltyPoints ?? 0;
    if (locked <= 0) {
      setMessage(`${user.email} has no locked points`);
      return;
    }

    const unlockLabel = amount ? `${amount.toLocaleString()} points` : `all ${locked.toLocaleString()} locked points`;
    const confirmed = window.confirm(
      `Unlock ${unlockLabel} for ${user.name}?\n\nThey can use these at checkout immediately.`
    );
    if (!confirmed) return;

    setSavingId(user.id);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          unlockLoyaltyPoints: amount ?? true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unlock failed');
      setUsers((prev) => prev.map((item) => (item.id === user.id ? data.user : item)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
      const unlocked = data.unlockedPoints ?? locked;
      setMessage(`Unlocked ${unlocked.toLocaleString()} pts for ${user.email}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to unlock points');
    } finally {
      setSavingId(null);
    }
  };

  const resetUserPassword = async (user: AdminUser, newPassword: string) => {
    setSavingId(user.id);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');
      setMessage(`Password reset for ${user.email}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setSavingId(null);
    }
  };

  const markFreeEighthForUser = async (user: AdminUser) => {
    if (user.freeEighthReceivedAt) {
      setMessage('This member has already received the free 1/8th');
      return;
    }
    const orderId = window.prompt('Enter related order ID (or blank for manual):', '') || `manual-${Date.now()}`;
    setSavingId(user.id);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          freeEighthReceivedAt: new Date().toISOString(),
          freeEighthOrderId: orderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mark failed');
      setUsers((prev) => prev.map((item) => (item.id === user.id ? data.user : item)));
      setMessage(`Free 1/8th marked for ${user.email}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to mark free 1/8th');
    } finally {
      setSavingId(null);
    }
  };

  const addOrderForUser = async (user: AdminUser) => {
    if (!user.email) return;
    const validItems = addOrderItems.filter((i) => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      setMessage('Add at least one item');
      return;
    }
    setAddingOrder(true);
    setMessage('');
    try {
      const subtotal = validItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
      const shipping = 9.99;
      const total = subtotal + shipping;
      const customer = {
        email: user.email,
        name: user.name,
        address: user.shippingAddress?.address || '',
        city: user.shippingAddress?.city || '',
        state: user.shippingAddress?.state || '',
        zip: user.shippingAddress?.zip || '',
        phone: user.phone || '',
      };
      const payload = {
        manual: true,
        customer,
        items: validItems,
        subtotal,
        shipping,
        total,
        paymentMethod: 'manual',
        paymentStatus: 'paid',
        status: addOrderStatus,
        freeEighthBonus: addOrderFreeEighth,
        freeEighthNote: addOrderFreeEighth ? 'Free 1/8th manually added by admin for this client' : undefined,
        trackingNumber: addOrderTrackingNumber.trim() || undefined,
        trackingCarrier: addOrderTrackingNumber.trim() ? addOrderTrackingCarrier : undefined,
      };
      const res = await adminFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Order #${data.orderId} added to ${user.email}. Notification sent. Tracker updated.`);
        setShowAddOrderForm(false);
        setAddOrderItems([{ name: '', quantity: 1, price: 0 }]);
        setAddOrderStatus('confirmed');
        setAddOrderTrackingNumber('');
        setAddOrderTrackingCarrier('usps');
        setAddOrderFreeEighth(false);
        await loadUserOrders(user.email);
        await loadUsers(search);
      } else {
        setMessage(data.error || 'Failed to add order');
      }
    } catch (e) {
      setMessage('Error adding order');
    } finally {
      setAddingOrder(false);
    }
  };

  const addAddOrderItem = () => setAddOrderItems([...addOrderItems, { name: '', quantity: 1, price: 0 }]);
  const updateAddOrderItem = (index: number, field: string, value: any) => {
    const updated = [...addOrderItems];
    updated[index][field] = value;
    setAddOrderItems(updated);
  };
  const removeAddOrderItem = (index: number) => {
    if (addOrderItems.length > 1) setAddOrderItems(addOrderItems.filter((_, i) => i !== index));
  };

  const updateOrderTracking = async (orderId: string, trackingNumber: string, carrier: string) => {
    try {
      await adminFetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, trackingNumber: trackingNumber.trim() || undefined, trackingCarrier: carrier }),
      });
      setMessage('Tracking updated. Kush Tracker will reflect it.');
      if (selectedUser) await loadUserOrders(selectedUser.email);
    } catch {
      setMessage('Failed to update tracking');
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
          <label className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
            <input
              type="checkbox"
              checked={showFree8thOnly}
              onChange={(e) => setShowFree8thOnly(e.target.checked)}
              className="accent-[#00ff9d]"
            />
            Only free 1/8th recipients
          </label>
          <p className="text-xs text-zinc-500 mb-3 px-1">
            {loading ? 'Loading...' : `${displayUsers.length} member${displayUsers.length === 1 ? '' : 's'}`}
            {showFree8thOnly ? ' (free 1/8th)' : ''}
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {displayUsers.map((user) => {
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
                    {(user.lockedLoyaltyPoints ?? 0) > 0 && (
                      <span className="text-amber-400">{user.lockedLoyaltyPoints.toLocaleString()} locked</span>
                    )}
                  </div>
                </button>
              );
            })}
            {!loading && displayUsers.length === 0 && (
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
              onResetPassword={(newPassword) => resetUserPassword(selectedUser, newPassword)}
              onUnlockPoints={(amount) => unlockUserPoints(selectedUser, amount)}
              onMarkFreeEighth={() => markFreeEighthForUser(selectedUser)}
              userOrders={userOrders}
              loadingUserOrders={loadingUserOrders}
              showAddOrderForm={showAddOrderForm}
              setShowAddOrderForm={setShowAddOrderForm}
              addOrderItems={addOrderItems}
              addAddOrderItem={addAddOrderItem}
              updateAddOrderItem={updateAddOrderItem}
              removeAddOrderItem={removeAddOrderItem}
              addOrderStatus={addOrderStatus}
              setAddOrderStatus={setAddOrderStatus}
              addOrderTrackingNumber={addOrderTrackingNumber}
              setAddOrderTrackingNumber={setAddOrderTrackingNumber}
              addOrderTrackingCarrier={addOrderTrackingCarrier}
              setAddOrderTrackingCarrier={setAddOrderTrackingCarrier}
              addOrderFreeEighth={addOrderFreeEighth}
              setAddOrderFreeEighth={setAddOrderFreeEighth}
              addingOrder={addingOrder}
              addOrderForUser={() => addOrderForUser(selectedUser)}
              updateOrderTracking={updateOrderTracking}
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
  onResetPassword,
  onUnlockPoints,
  onMarkFreeEighth,
  userOrders,
  loadingUserOrders,
  showAddOrderForm,
  setShowAddOrderForm,
  addOrderItems,
  addAddOrderItem,
  updateAddOrderItem,
  removeAddOrderItem,
  addOrderStatus,
  setAddOrderStatus,
  addOrderTrackingNumber,
  setAddOrderTrackingNumber,
  addOrderTrackingCarrier,
  setAddOrderTrackingCarrier,
  addOrderFreeEighth,
  setAddOrderFreeEighth,
  addingOrder,
  addOrderForUser,
  updateOrderTracking,
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
  onResetPassword: (newPassword: string) => void;
  onUnlockPoints: (amount?: number) => void;
  onMarkFreeEighth?: () => void;
  userOrders: any[];
  loadingUserOrders: boolean;
  showAddOrderForm: boolean;
  setShowAddOrderForm: (v: boolean) => void;
  addOrderItems: any[];
  addAddOrderItem: () => void;
  updateAddOrderItem: (index: number, field: string, value: any) => void;
  removeAddOrderItem: (index: number) => void;
  addOrderStatus: string;
  setAddOrderStatus: (v: string) => void;
  addOrderTrackingNumber: string;
  setAddOrderTrackingNumber: (v: string) => void;
  addOrderTrackingCarrier: string;
  setAddOrderTrackingCarrier: (v: string) => void;
  addOrderFreeEighth: boolean;
  setAddOrderFreeEighth: (v: boolean) => void;
  addingOrder: boolean;
  addOrderForUser: () => void;
  updateOrderTracking: (orderId: string, trackingNumber: string, carrier: string) => void;
}) {
  const redeemable = Math.max(0, draft.loyaltyPoints - draft.lockedLoyaltyPoints);
  const idStatus = user.idVerification?.status ?? (user.idVerified ? 'verified' : 'none');
  const [rejectReason, setRejectReason] = useState('');
  const [partialUnlock, setPartialUnlock] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleResetPassword = () => {
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    const confirmed = window.confirm(
      `Reset password for ${user.email}?\n\nThey will need to use the new password on their next login.`
    );
    if (!confirmed) return;
    onResetPassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
  };

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
            {user.freeEighthReceivedAt && <Badge label="Free 1/8th" tone="green" />}
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

      <section className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5">
        <SectionTitle>Reset Password</SectionTitle>
        <p className="text-sm text-zinc-500 mb-4">
          Set a new login password for this member. Use when they cannot access their email or need help
          getting back in. This does not send them an email — share the new password securely.
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <Field
            label="New password"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="At least 6 characters"
          />
          <Field
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Re-enter password"
          />
        </div>
        {passwordError && <p className="text-sm text-red-400 mb-3">{passwordError}</p>}
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={saving || deleting || !newPassword || !confirmPassword}
          className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl disabled:opacity-40"
        >
          {saving ? 'Resetting...' : 'Reset Password'}
        </button>
      </section>

      <section className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5">
        <SectionTitle>Orders & Tracking for this Client</SectionTitle>
        <p className="text-sm text-zinc-500 mb-4">View orders linked to this account. Add new manual orders (will notify client and appear in their Kush Tracker). Edit tracking numbers directly here for accuracy in the tracker.</p>

        <button
          onClick={() => setShowAddOrderForm(!showAddOrderForm)}
          disabled={addingOrder || saving || deleting}
          className="mb-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-black text-sm font-bold rounded-xl"
        >
          {showAddOrderForm ? 'Cancel Add Order' : '+ Add Manual Order for this Client'}
        </button>

        {showAddOrderForm && (
          <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 space-y-3">
            <div className="text-sm font-medium">New Order Items</div>
            {addOrderItems.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <input value={item.name} onChange={e => updateAddOrderItem(idx, 'name', e.target.value)} placeholder="Item name (e.g. Free 1/8th - Strain)" className="flex-1 bg-black border border-zinc-700 p-2 rounded text-sm" />
                <input type="number" value={item.quantity} onChange={e => updateAddOrderItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-16 bg-black border border-zinc-700 p-2 rounded text-sm" />
                <input type="number" step="0.01" value={item.price} onChange={e => updateAddOrderItem(idx, 'price', parseFloat(e.target.value) || 0)} placeholder="Price" className="w-20 bg-black border border-zinc-700 p-2 rounded text-sm" />
                {addOrderItems.length > 1 && <button onClick={() => removeAddOrderItem(idx)} className="text-red-400 px-2">×</button>}
              </div>
            ))}
            <button onClick={addAddOrderItem} className="text-[#00ff9d] text-xs">+ Add Item</button>

            <div className="grid grid-cols-2 gap-3 text-sm mt-2">
              <select value={addOrderStatus} onChange={e => setAddOrderStatus(e.target.value)} className="bg-black border border-zinc-700 p-3 rounded-xl">
                <option value="confirmed">confirmed</option>
                <option value="packing">packing</option>
                <option value="sealed">sealed</option>
                <option value="shipped">shipped</option>
                <option value="delivered">delivered</option>
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={addOrderFreeEighth} onChange={e => setAddOrderFreeEighth(e.target.checked)} /> Free 1/8th bonus
              </label>
            </div>

            <div>
              <input value={addOrderTrackingNumber} onChange={e => setAddOrderTrackingNumber(e.target.value)} placeholder="Tracking number (optional)" className="w-full bg-black border border-zinc-700 p-3 rounded-xl text-sm font-mono mb-2" />
              <select value={addOrderTrackingCarrier} onChange={e => setAddOrderTrackingCarrier(e.target.value)} className="bg-black border border-zinc-700 p-3 rounded-xl text-sm">
                <option value="usps">USPS</option>
                <option value="ups">UPS</option>
                <option value="fedex">FedEx</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button onClick={addOrderForUser} disabled={addingOrder || !addOrderItems.some(i => i.name.trim())} className="w-full py-3 bg-[#00ff9d] text-black font-bold rounded-2xl disabled:opacity-50">
              {addingOrder ? 'Adding & Notifying...' : 'Add Order to Client Profile & Notify'}
            </button>
          </div>
        )}

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Recent Orders ({user.orderCount})</div>
          {loadingUserOrders ? (
            <p className="text-xs text-zinc-400">Loading orders...</p>
          ) : userOrders.length === 0 ? (
            <p className="text-xs text-zinc-500">No orders yet for this client.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {userOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="bg-black border border-zinc-700 rounded-xl p-3">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-mono text-[#00ff9d]">#{order.id}</span> · {order.status || 'pending'} · ${order.total || order.subtotal || 0}
                    </div>
                    <div className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                  {order.items && order.items.length > 0 && (
                    <div className="text-xs text-zinc-400 mt-1">{order.items.map((i: any) => i.name).join(', ')}</div>
                  )}
                  <div className="mt-2 flex gap-2 items-center">
                    <input
                      defaultValue={order.trackingNumber || ''}
                      placeholder="Tracking #"
                      className="flex-1 bg-zinc-900 border border-zinc-700 p-1 rounded text-xs font-mono"
                      onBlur={(e) => {
                        if (e.target.value !== (order.trackingNumber || '')) {
                          updateOrderTracking(order.id, e.target.value, order.trackingCarrier || 'usps');
                        }
                      }}
                    />
                    <select
                      defaultValue={order.trackingCarrier || 'usps'}
                      onChange={(e) => updateOrderTracking(order.id, order.trackingNumber || '', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 p-1 rounded text-xs"
                    >
                      <option value="usps">USPS</option>
                      <option value="ups">UPS</option>
                      <option value="fedex">FedEx</option>
                      <option value="other">Other</option>
                    </select>
                    <a href={`/track/${order.id}`} target="_blank" className="text-[#00ff9d] text-xs underline">View Tracker</a>
                  </div>
                  {order.freeEighthNote && <div className="text-[10px] text-amber-300 mt-1">🌿 Free 1/8th: {order.freeEighthNote}</div>}
                </div>
              ))}
            </div>
          )}
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
        {draft.lockedLoyaltyPoints > 0 && (
          <div className="mt-5 p-4 rounded-2xl border border-amber-900/50 bg-amber-950/20">
            <p className="text-sm text-amber-200/90 mb-3">
              {draft.lockedLoyaltyPoints.toLocaleString()} pts are locked (usually signup bonus until first purchase).
              Unlock them so this member can redeem at checkout right away.
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <button
                type="button"
                onClick={() => onUnlockPoints()}
                disabled={saving || deleting}
                className="px-4 py-2 bg-[#00ff9d] text-black rounded-xl text-sm font-bold disabled:opacity-40"
              >
                {saving ? 'Unlocking...' : `Unlock all ${draft.lockedLoyaltyPoints.toLocaleString()} pts`}
              </button>
              <div className="flex gap-2 items-end">
                <Field
                  label="Or unlock amount"
                  type="number"
                  value={partialUnlock}
                  onChange={setPartialUnlock}
                  placeholder="e.g. 1000"
                />
                <button
                  type="button"
                  onClick={() => {
                    const amount = Math.max(0, Math.floor(Number(partialUnlock) || 0));
                    if (amount > 0) onUnlockPoints(amount);
                  }}
                  disabled={saving || deleting || !partialUnlock}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm mb-1 disabled:opacity-40"
                >
                  Unlock partial
                </button>
              </div>
            </div>
          </div>
        )}
        {(user.pointsEarnedFromReferrals ?? 0) > 0 && (
          <p className="text-xs text-zinc-500 mt-4">
            Referral points earned: {user.pointsEarnedFromReferrals?.toLocaleString()} · claimed:{' '}
            {user.pointsClaimedFromReferrals?.toLocaleString()}
          </p>
        )}
      </section>

      <section className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5">
        <SectionTitle>Free 1/8th First-Order Bonus Tracking</SectionTitle>
        {user.freeEighthReceivedAt ? (
          <div className="text-sm">
            <p className="text-green-400 font-medium">Granted</p>
            <p className="text-zinc-400 text-xs mt-1">
              {new Date(user.freeEighthReceivedAt).toLocaleString()} for order #{user.freeEighthOrderId || '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-2">This member received their free 1/8th on first hemp order.</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-zinc-400 mb-3">Not yet granted (eligible on first qualifying hemp order).</p>
            {onMarkFreeEighth && (
              <button
                onClick={onMarkFreeEighth}
                disabled={saving || deleting}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-xl border border-zinc-700"
              >
                Manually mark as granted
              </button>
            )}
          </div>
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