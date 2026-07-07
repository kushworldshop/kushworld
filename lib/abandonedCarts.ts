import { sendAbandonedCartEmail } from '@/lib/email';
import { readCartEntries, type CartSnapshot } from '@/lib/cartStats';
import { readOrders } from '@/lib/ordersStore';
import fs from 'fs/promises';
import path from 'path';

const ENTRIES_FILE = path.join(process.cwd(), 'data', 'cart-entries.json');

export const ABANDONED_CART_HOURS = Number(process.env.ABANDONED_CART_HOURS || 1);
export const ABANDONED_CART_REMINDER_COOLDOWN_DAYS = Number(
  process.env.ABANDONED_CART_REMINDER_COOLDOWN_DAYS || 7
);
export const STALE_CART_DAYS = Number(process.env.STALE_CART_DAYS || 30);

function hoursAgo(hours: number): number {
  return Date.now() - hours * 60 * 60 * 1000;
}

function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

async function writeCartFile(carts: CartSnapshot[], updatedAt: string) {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(ENTRIES_FILE, JSON.stringify({ carts, updatedAt }, null, 2));
}

export function isCartAbandoned(cart: CartSnapshot, now = Date.now()): boolean {
  if (cart.isGuest || !cart.userEmail || cart.items.length === 0) return false;
  return new Date(cart.updatedAt).getTime() <= hoursAgo(ABANDONED_CART_HOURS);
}

export function canSendReminder(cart: CartSnapshot, now = Date.now()): boolean {
  if (!isCartAbandoned(cart, now)) return false;
  if (!cart.reminderSentAt) return true;
  return new Date(cart.reminderSentAt).getTime() <= daysAgo(ABANDONED_CART_REMINDER_COOLDOWN_DAYS);
}

async function loadRecentOrderEmails(): Promise<Map<string, string>> {
  const orders = await readOrders<{
    customer?: { email?: string };
    email?: string;
    createdAt?: string;
  }>();

  const latestByEmail = new Map<string, string>();
  for (const order of orders) {
    const email = (order.customer?.email || order.email || '').trim().toLowerCase();
    const createdAt = order.createdAt;
    if (!email || !createdAt) continue;
    const existing = latestByEmail.get(email);
    if (!existing || createdAt > existing) {
      latestByEmail.set(email, createdAt);
    }
  }
  return latestByEmail;
}

function orderedAfterCart(cart: CartSnapshot, latestOrderAt?: string): boolean {
  if (!latestOrderAt) return false;
  return latestOrderAt > cart.updatedAt;
}

export async function pruneStaleCarts(): Promise<number> {
  const file = await readCartEntries();
  const cutoff = daysAgo(STALE_CART_DAYS);
  const before = file.carts.length;
  file.carts = file.carts.filter((cart) => new Date(cart.updatedAt).getTime() > cutoff);
  const removed = before - file.carts.length;
  if (removed > 0) {
    file.updatedAt = new Date().toISOString();
    await writeCartFile(file.carts, file.updatedAt);
  }
  return removed;
}

export interface AbandonedCartProcessResult {
  pruned: number;
  eligible: number;
  sent: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
  details: Array<{
    ownerKey: string;
    email: string;
    action: 'sent' | 'skipped' | 'failed' | 'would_send';
    reason?: string;
  }>;
}

export async function processAbandonedCarts(options?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<AbandonedCartProcessResult> {
  const dryRun = options?.dryRun ?? false;
  const limit = options?.limit ?? 50;
  const pruned = await pruneStaleCarts();

  const file = await readCartEntries();
  const latestOrders = await loadRecentOrderEmails();
  const candidates = file.carts.filter((cart) => canSendReminder(cart)).slice(0, limit);

  const result: AbandonedCartProcessResult = {
    pruned,
    eligible: candidates.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    dryRun,
    details: [],
  };

  const now = new Date().toISOString();

  for (const cart of candidates) {
    const email = cart.userEmail!.trim().toLowerCase();
    const latestOrderAt = latestOrders.get(email);

    if (orderedAfterCart(cart, latestOrderAt)) {
      result.skipped += 1;
      result.details.push({
        ownerKey: cart.ownerKey,
        email,
        action: 'skipped',
        reason: 'Customer placed an order after this cart was last updated',
      });
      continue;
    }

    if (dryRun) {
      result.details.push({ ownerKey: cart.ownerKey, email, action: 'would_send' });
      continue;
    }

    const paidItems = cart.items.filter((item) => !item.isFirstOrderBonus);
    const sendResult = await sendAbandonedCartEmail(email, {
      name: cart.userName,
      items: paidItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: cart.subtotal,
    });

    if (sendResult.sent) {
      const index = file.carts.findIndex((row) => row.ownerKey === cart.ownerKey);
      if (index >= 0) {
        file.carts[index] = { ...file.carts[index], reminderSentAt: now };
      }
      result.sent += 1;
      result.details.push({ ownerKey: cart.ownerKey, email, action: 'sent' });
    } else if (sendResult.stub) {
      result.skipped += 1;
      result.details.push({
        ownerKey: cart.ownerKey,
        email,
        action: 'skipped',
        reason: 'Email stub mode (RESEND_API_KEY not set)',
      });
    } else {
      result.failed += 1;
      result.details.push({
        ownerKey: cart.ownerKey,
        email,
        action: 'failed',
        reason: sendResult.error || 'Send failed',
      });
    }
  }

  if (!dryRun && result.sent > 0) {
    file.updatedAt = now;
    await writeCartFile(file.carts, file.updatedAt);
  }

  return result;
}

export async function getAbandonedCartSummary() {
  const file = await readCartEntries();
  const now = Date.now();
  const abandoned = file.carts.filter((cart) => isCartAbandoned(cart, now));
  const eligible = file.carts.filter((cart) => canSendReminder(cart, now));
  const reminded = file.carts.filter((cart) => cart.reminderSentAt).length;
  const staleCutoff = daysAgo(STALE_CART_DAYS);
  const stale = file.carts.filter((cart) => new Date(cart.updatedAt).getTime() <= staleCutoff).length;

  return {
    abandonedCount: abandoned.length,
    eligibleForReminder: eligible.length,
    remindedCount: reminded,
    staleCount: stale,
    settings: {
      abandonedHours: ABANDONED_CART_HOURS,
      reminderCooldownDays: ABANDONED_CART_REMINDER_COOLDOWN_DAYS,
      staleDays: STALE_CART_DAYS,
    },
  };
}