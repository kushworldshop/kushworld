import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  getSubscriptionPlan,
  isActiveSubscriptionStatus,
  type PublicSubscriptionSummary,
  type SubscriptionPaymentMethod,
  type SubscriptionPlanId,
  type SubscriptionRecord,
  type SubscriptionStatus,
} from '@/lib/subscriptionTypes';

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'data', 'subscriptions.json');

async function ensureSubscriptionsFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(SUBSCRIPTIONS_FILE);
  } catch {
    await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify([], null, 2));
  }
}

export async function readSubscriptions(): Promise<SubscriptionRecord[]> {
  await ensureSubscriptionsFile();
  const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
  return JSON.parse(data) as SubscriptionRecord[];
}

export async function writeSubscriptions(subscriptions: SubscriptionRecord[]) {
  await writeSubscriptionsFile(subscriptions);
}

async function writeSubscriptionsFile(subscriptions: SubscriptionRecord[]) {
  await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2));
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function toPublicSubscriptionSummary(record: SubscriptionRecord): PublicSubscriptionSummary {
  const plan = getSubscriptionPlan(record.planId);
  return {
    id: record.id,
    planId: record.planId,
    planLabel: plan.label,
    status: record.status,
    price: record.price,
    currency: record.currency,
    paymentMethod: record.paymentMethod,
    currentPeriodStart: record.currentPeriodStart,
    currentPeriodEnd: record.currentPeriodEnd,
    nextBillingDate: record.nextBillingDate,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    perks: plan.perks,
  };
}

export async function getSubscriptionById(id: string): Promise<SubscriptionRecord | null> {
  const subscriptions = await readSubscriptions();
  return subscriptions.find((sub) => sub.id === id) ?? null;
}

export async function getSubscriptionsForUser(userId: string): Promise<SubscriptionRecord[]> {
  const subscriptions = await readSubscriptions();
  return subscriptions
    .filter((sub) => sub.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getActiveSubscriptionForUser(userId: string): Promise<SubscriptionRecord | null> {
  const subscriptions = await getSubscriptionsForUser(userId);
  return (
    subscriptions.find((sub) => isActiveSubscriptionStatus(sub.status) && !sub.cancelAtPeriodEnd) ??
    subscriptions.find((sub) => isActiveSubscriptionStatus(sub.status)) ??
    null
  );
}

export async function createSubscriptionRecord(input: {
  userId: string;
  email: string;
  planId: SubscriptionPlanId;
  price: number;
  paymentMethod: SubscriptionPaymentMethod;
  status?: SubscriptionStatus;
  processor?: SubscriptionRecord['processor'];
  externalSubscriptionId?: string;
  externalCustomerId?: string;
  notes?: string;
}): Promise<SubscriptionRecord> {
  const subscriptions = await readSubscriptions();
  const now = new Date();
  const periodEnd = addMonths(now, 1);
  const isoNow = now.toISOString();
  const record: SubscriptionRecord = {
    id: `sub_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    userId: input.userId,
    email: input.email,
    planId: input.planId,
    status: input.status ?? 'pending',
    price: input.price,
    currency: 'USD',
    paymentMethod: input.paymentMethod,
    processor: input.processor,
    externalSubscriptionId: input.externalSubscriptionId,
    externalCustomerId: input.externalCustomerId,
    currentPeriodStart: isoNow,
    currentPeriodEnd: periodEnd.toISOString(),
    nextBillingDate: periodEnd.toISOString(),
    createdAt: isoNow,
    updatedAt: isoNow,
    notes: input.notes,
  };
  subscriptions.push(record);
  await writeSubscriptionsFile(subscriptions);
  return record;
}

export async function updateSubscriptionById(
  id: string,
  updater: (record: SubscriptionRecord) => SubscriptionRecord
): Promise<SubscriptionRecord | null> {
  const subscriptions = await readSubscriptions();
  const index = subscriptions.findIndex((sub) => sub.id === id);
  if (index === -1) return null;
  subscriptions[index] = updater({
    ...subscriptions[index],
    updatedAt: new Date().toISOString(),
  });
  await writeSubscriptionsFile(subscriptions);
  return subscriptions[index];
}

export async function cancelSubscription(
  id: string,
  options?: { immediate?: boolean }
): Promise<SubscriptionRecord | null> {
  return updateSubscriptionById(id, (record) => {
    if (options?.immediate) {
      return {
        ...record,
        status: 'cancelled',
        cancelAtPeriodEnd: false,
        cancelledAt: new Date().toISOString(),
        nextBillingDate: undefined,
      };
    }
    return {
      ...record,
      cancelAtPeriodEnd: true,
      nextBillingDate: undefined,
    };
  });
}

export async function activateSubscription(id: string): Promise<SubscriptionRecord | null> {
  return updateSubscriptionById(id, (record) => ({
    ...record,
    status: 'active',
    cancelAtPeriodEnd: false,
    cancelledAt: undefined,
  }));
}