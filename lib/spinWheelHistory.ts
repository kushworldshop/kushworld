import fs from 'fs/promises';
import path from 'path';
import { readOrders } from '@/lib/ordersStore';
import type { SpinPrizeType } from '@/lib/spinWheelTypes';
import { readUsers } from '@/lib/users';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'spin-history.json');

export type SpinHistoryStatus =
  | 'no_prize'
  | 'instant_points'
  | 'awaiting_accept'
  | 'pending'
  | 'used'
  | 'forfeited'
  | 'expired';

export interface SpinHistoryEntry {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  spunAt: string;
  pointsSpent: number;
  segmentId: string;
  segmentLabel: string;
  prizeType: SpinPrizeType;
  prizeId?: string;
  prizeLabel?: string;
  instantBonusPoints?: number;
  expiresAt?: string;
  status: SpinHistoryStatus;
  statusAt?: string;
  orderId?: string;
  orderTotal?: number;
}

export interface SpinHistoryStats {
  totalSpins: number;
  prizesWon: number;
  awaitingAccept: number;
  pending: number;
  used: number;
  forfeited: number;
  expired: number;
  instantPoints: number;
  noPrize: number;
  jackpotsWon: number;
  jackpotsUsed: number;
  totalPointsSpent: number;
  totalInstantPointsAwarded: number;
}

async function ensureHistoryFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(HISTORY_FILE);
  } catch {
    await fs.writeFile(HISTORY_FILE, JSON.stringify([], null, 2));
  }
}

export async function readSpinHistory(): Promise<SpinHistoryEntry[]> {
  await ensureHistoryFile();
  const data = await fs.readFile(HISTORY_FILE, 'utf8');
  return JSON.parse(data) as SpinHistoryEntry[];
}

async function writeSpinHistory(entries: SpinHistoryEntry[]) {
  await ensureHistoryFile();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(entries, null, 2));
}

export function resolveDisplayStatus(entry: SpinHistoryEntry): SpinHistoryStatus {
  if (entry.status === 'pending' && entry.expiresAt && new Date(entry.expiresAt).getTime() <= Date.now()) {
    return 'expired';
  }
  return entry.status;
}

export async function recordSpinHistory(input: {
  userId: string;
  userEmail: string;
  userName: string;
  pointsSpent: number;
  segmentId: string;
  segmentLabel: string;
  prizeType: SpinPrizeType;
  prizeId?: string;
  prizeLabel?: string;
  instantBonusPoints?: number;
  expiresAt?: string;
  status: SpinHistoryStatus;
}): Promise<SpinHistoryEntry> {
  const entry: SpinHistoryEntry = {
    id: `spin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    spunAt: new Date().toISOString(),
    statusAt: new Date().toISOString(),
    ...input,
  };

  const history = await readSpinHistory();
  history.unshift(entry);
  await writeSpinHistory(history);
  return entry;
}

function findOpenPrizeEntry(history: SpinHistoryEntry[], prizeId: string): number {
  return history.findIndex(
    (entry) =>
      entry.prizeId === prizeId &&
      (entry.status === 'awaiting_accept' || entry.status === 'pending')
  );
}

export async function markSpinHistoryForfeited(prizeId: string): Promise<void> {
  const history = await readSpinHistory();
  const index = findOpenPrizeEntry(history, prizeId);
  if (index === -1) return;

  history[index] = {
    ...history[index],
    status: 'forfeited',
    statusAt: new Date().toISOString(),
  };
  await writeSpinHistory(history);
}

export async function markSpinHistoryAccepted(
  prizeId: string,
  expiresAt: string
): Promise<void> {
  const history = await readSpinHistory();
  const index = history.findIndex(
    (entry) => entry.prizeId === prizeId && entry.status === 'awaiting_accept'
  );
  if (index === -1) return;

  history[index] = {
    ...history[index],
    status: 'pending',
    expiresAt,
    statusAt: new Date().toISOString(),
  };
  await writeSpinHistory(history);
}

export async function extendSpinHistoryExpiry(
  prizeId: string,
  expiresAt: string
): Promise<boolean> {
  const history = await readSpinHistory();
  const index = history.findIndex(
    (entry) => entry.prizeId === prizeId && entry.status === 'pending'
  );
  if (index === -1) return false;

  history[index] = {
    ...history[index],
    expiresAt,
    statusAt: new Date().toISOString(),
  };
  await writeSpinHistory(history);
  return true;
}

export async function markSpinHistoryUsed(
  prizeId: string,
  meta: { orderId?: string; orderTotal?: number } = {}
): Promise<void> {
  const history = await readSpinHistory();
  const index = history.findIndex(
    (entry) =>
      entry.prizeId === prizeId && (entry.status === 'pending' || entry.status === 'expired')
  );
  if (index === -1) return;

  history[index] = {
    ...history[index],
    status: 'used',
    statusAt: new Date().toISOString(),
    orderId: meta.orderId ?? history[index].orderId,
    orderTotal: meta.orderTotal ?? history[index].orderTotal,
  };
  await writeSpinHistory(history);
}

function prizeIdsInHistory(history: SpinHistoryEntry[]): Set<string> {
  return new Set(history.map((entry) => entry.prizeId).filter((id): id is string => !!id));
}

function inferPrizeTypeFromLabel(label?: string): SpinPrizeType {
  if (!label) return 'percent_off_10';
  const normalized = label.toLowerCase();
  if (normalized.includes('t-shirt') || normalized.includes('tshirt')) return 'free_tshirt';
  if (normalized.includes('shipping')) return 'free_shipping';
  if (normalized.includes('20%')) return 'percent_off_20';
  if (normalized.includes('10%')) return 'percent_off_10';
  if (normalized.includes('$5')) return 'fixed_5_off';
  return 'percent_off_10';
}

export async function reconcileSpinHistory(): Promise<number> {
  const history = await readSpinHistory();
  const knownPrizeIds = prizeIdsInHistory(history);
  let added = 0;

  const users = await readUsers();
  for (const user of users) {
    const pending = user.pendingSpinPrize;
    if (pending && !knownPrizeIds.has(pending.id)) {
      history.unshift({
        id: `spin_pending_${pending.id}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        spunAt: pending.wonAt,
        pointsSpent: 0,
        segmentId: pending.segmentId,
        segmentLabel: pending.label,
        prizeType: pending.type,
        prizeId: pending.id,
        prizeLabel: pending.label,
        status: 'awaiting_accept',
        statusAt: pending.wonAt,
      });
      knownPrizeIds.add(pending.id);
      added += 1;
    }

    const storedCoupons = user.savedSpinCoupons ?? [];
    const legacyCoupons = user.activeSpinPrize ? [user.activeSpinPrize] : [];
    const allCoupons = storedCoupons.length > 0 ? storedCoupons : legacyCoupons;

    for (const prize of allCoupons) {
      if (!prize || knownPrizeIds.has(prize.id)) continue;

      const status: SpinHistoryStatus = prize.usedAt
        ? 'used'
        : !prize.expiresAt
          ? 'awaiting_accept'
          : new Date(prize.expiresAt).getTime() <= Date.now()
            ? 'expired'
            : 'pending';

      history.unshift({
        id: `spin_legacy_${prize.id}`,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        spunAt: prize.wonAt,
        pointsSpent: 0,
        segmentId: prize.segmentId,
        segmentLabel: prize.label,
        prizeType: prize.type,
        prizeId: prize.id,
        prizeLabel: prize.label,
        expiresAt: prize.expiresAt,
        status,
        statusAt: prize.usedAt ?? prize.wonAt,
      });
      knownPrizeIds.add(prize.id);
      added += 1;
    }
  }

  const orders = await readOrders<{
    id: string;
    userId?: string;
    email?: string;
    customer?: { email?: string; name?: string };
    spinPrizeId?: string;
    spinPrizeLabel?: string;
    total?: number;
    createdAt?: string;
  }>();

  for (const order of orders) {
    if (!order.spinPrizeId || knownPrizeIds.has(order.spinPrizeId)) continue;

    const email = order.customer?.email || order.email || '';
    const user = users.find((item) => item.id === order.userId || item.email === email);

    history.unshift({
      id: `spin_order_${order.id}_${order.spinPrizeId}`,
      userId: user?.id ?? order.userId ?? 'unknown',
      userEmail: user?.email ?? email,
      userName: user?.name ?? order.customer?.name ?? 'Customer',
      spunAt: order.createdAt ?? new Date().toISOString(),
      pointsSpent: 0,
      segmentId: 'unknown',
      segmentLabel: order.spinPrizeLabel ?? 'Wheel prize',
      prizeType: inferPrizeTypeFromLabel(order.spinPrizeLabel),
      prizeId: order.spinPrizeId,
      prizeLabel: order.spinPrizeLabel,
      status: 'used',
      statusAt: order.createdAt,
      orderId: order.id,
      orderTotal: order.total,
    });
    knownPrizeIds.add(order.spinPrizeId);
    added += 1;
  }

  if (added > 0) {
    await writeSpinHistory(history);
  }

  return added;
}

function buildStats(entries: SpinHistoryEntry[]): SpinHistoryStats {
  const stats: SpinHistoryStats = {
    totalSpins: entries.length,
    prizesWon: 0,
    awaitingAccept: 0,
    pending: 0,
    used: 0,
    forfeited: 0,
    expired: 0,
    instantPoints: 0,
    noPrize: 0,
    jackpotsWon: 0,
    jackpotsUsed: 0,
    totalPointsSpent: 0,
    totalInstantPointsAwarded: 0,
  };

  for (const entry of entries) {
    const status = resolveDisplayStatus(entry);
    stats.totalPointsSpent += entry.pointsSpent;
    stats.totalInstantPointsAwarded += entry.instantBonusPoints ?? 0;

    if (status === 'no_prize') stats.noPrize += 1;
    if (status === 'instant_points') stats.instantPoints += 1;
    if (status === 'awaiting_accept') stats.awaitingAccept += 1;
    if (status === 'pending') stats.pending += 1;
    if (status === 'used') stats.used += 1;
    if (status === 'forfeited') stats.forfeited += 1;
    if (status === 'expired') stats.expired += 1;

    if (
      entry.prizeId &&
      entry.prizeType !== 'try_again' &&
      entry.prizeType !== 'bonus_points'
    ) {
      stats.prizesWon += 1;
    }

    if (entry.prizeType === 'free_tshirt') {
      stats.jackpotsWon += 1;
      if (status === 'used') stats.jackpotsUsed += 1;
    }
  }

  return stats;
}

export type SpinHistoryRow = SpinHistoryEntry & { displayStatus: SpinHistoryStatus };

export interface SpinHistoryMemberGroup {
  memberKey: string;
  userId: string;
  userEmail: string;
  userName: string;
  totalSpins: number;
  totalPointsSpent: number;
  instantPointsAwarded: number;
  savedCoupons: number;
  awaitingAccept: number;
  usedPrizes: number;
  lastSpinAt: string;
  entries: SpinHistoryRow[];
}

function spinHistoryMemberKey(entry: Pick<SpinHistoryEntry, 'userId' | 'userEmail'>): string {
  if (entry.userId && entry.userId !== 'unknown') return entry.userId;
  return entry.userEmail.toLowerCase().trim() || 'unknown';
}

function entryMatchesSearch(entry: SpinHistoryRow, q: string): boolean {
  return (
    entry.userEmail.toLowerCase().includes(q) ||
    entry.userName.toLowerCase().includes(q) ||
    (entry.prizeLabel?.toLowerCase().includes(q) ?? false) ||
    entry.segmentLabel.toLowerCase().includes(q) ||
    (entry.orderId?.toLowerCase().includes(q) ?? false) ||
    (entry.prizeId?.toLowerCase().includes(q) ?? false)
  );
}

export function groupSpinHistoryByMember(
  rows: SpinHistoryRow[],
  options?: { memberLimit?: number }
): SpinHistoryMemberGroup[] {
  const grouped = new Map<string, SpinHistoryMemberGroup>();

  for (const entry of rows) {
    const key = spinHistoryMemberKey(entry);
    let group = grouped.get(key);
    if (!group) {
      group = {
        memberKey: key,
        userId: entry.userId,
        userEmail: entry.userEmail,
        userName: entry.userName,
        totalSpins: 0,
        totalPointsSpent: 0,
        instantPointsAwarded: 0,
        savedCoupons: 0,
        awaitingAccept: 0,
        usedPrizes: 0,
        lastSpinAt: entry.spunAt,
        entries: [],
      };
      grouped.set(key, group);
    }

    group.entries.push(entry);
    group.totalSpins += 1;
    group.totalPointsSpent += entry.pointsSpent;
    group.instantPointsAwarded += entry.instantBonusPoints ?? 0;

    if (entry.displayStatus === 'pending') group.savedCoupons += 1;
    if (entry.displayStatus === 'awaiting_accept') group.awaitingAccept += 1;
    if (entry.displayStatus === 'used') group.usedPrizes += 1;

    if (new Date(entry.spunAt).getTime() > new Date(group.lastSpinAt).getTime()) {
      group.lastSpinAt = entry.spunAt;
      group.userName = entry.userName;
      group.userEmail = entry.userEmail;
      if (entry.userId && entry.userId !== 'unknown') {
        group.userId = entry.userId;
      }
    }
  }

  for (const group of grouped.values()) {
    group.entries.sort(
      (a, b) => new Date(b.spunAt).getTime() - new Date(a.spunAt).getTime()
    );
  }

  const memberLimit = options?.memberLimit ?? 150;
  return Array.from(grouped.values())
    .sort((a, b) => new Date(b.lastSpinAt).getTime() - new Date(a.lastSpinAt).getTime())
    .slice(0, memberLimit);
}

export async function getAdminSpinHistory(options?: {
  q?: string;
  status?: SpinHistoryStatus | 'all';
  limit?: number;
  memberLimit?: number;
  reconcile?: boolean;
}): Promise<{
  entries: SpinHistoryRow[];
  members: SpinHistoryMemberGroup[];
  stats: SpinHistoryStats;
  reconciled: number;
}> {
  if (options?.reconcile) {
    await reconcileSpinHistory();
  }

  const q = options?.q?.toLowerCase().trim();
  const statusFilter = options?.status ?? 'all';

  const allRows = (await readSpinHistory()).map((entry) => ({
    ...entry,
    displayStatus: resolveDisplayStatus(entry),
  }));

  const statusFiltered =
    statusFilter === 'all'
      ? allRows
      : allRows.filter((entry) => entry.displayStatus === statusFilter);

  const rows = statusFiltered.filter((entry) => {
    if (!q) return true;
    return entryMatchesSearch(entry, q);
  });

  const limit = options?.limit ?? 500;
  const members = groupSpinHistoryByMember(rows, { memberLimit: options?.memberLimit ?? 150 });

  return {
    entries: rows.slice(0, limit),
    members,
    stats: buildStats(allRows),
    reconciled: 0,
  };
}