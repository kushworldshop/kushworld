import fs from 'fs/promises';
import path from 'path';
import { sendReferralProgramUpdateEmail } from '@/lib/email';
import { getUserByEmail } from '@/lib/users';

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'referral-notifications.json');

export type ReferralNotificationType =
  | 'promo_code_updated'
  | 'commission_rate_updated'
  | 'reward_points_updated'
  | 'global_program_updated'
  | 'referral_conversion';

export type ReferralChangeSource = 'admin' | 'customer' | 'system';

export interface ReferralNotification {
  id: string;
  userEmail: string;
  type: ReferralNotificationType;
  title: string;
  message: string;
  meta?: {
    oldValue?: string | number | null;
    newValue?: string | number | null;
    orderId?: string;
    changedBy?: ReferralChangeSource;
  };
  read: boolean;
  createdAt: string;
}

async function ensureNotificationsFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(NOTIFICATIONS_FILE);
  } catch {
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify([], null, 2));
  }
}

async function readNotifications(): Promise<ReferralNotification[]> {
  await ensureNotificationsFile();
  const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeNotifications(notifications: ReferralNotification[]) {
  await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getReferralNotificationsForEmail(
  email: string,
  limit = 20
): Promise<ReferralNotification[]> {
  const normalized = normalizeEmail(email);
  const notifications = await readNotifications();
  return notifications
    .filter((item) => item.userEmail === normalized)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getUnreadReferralNotificationCount(email: string): Promise<number> {
  const normalized = normalizeEmail(email);
  const notifications = await readNotifications();
  return notifications.filter((item) => item.userEmail === normalized && !item.read).length;
}

export async function markReferralNotificationsRead(
  email: string,
  ids?: string[]
): Promise<number> {
  const normalized = normalizeEmail(email);
  const notifications = await readNotifications();
  let updated = 0;

  for (const item of notifications) {
    if (item.userEmail !== normalized || item.read) continue;
    if (ids && ids.length > 0 && !ids.includes(item.id)) continue;
    item.read = true;
    updated += 1;
  }

  if (updated > 0) {
    await writeNotifications(notifications);
  }

  return updated;
}

interface CreateReferralNotificationInput {
  email: string;
  type: ReferralNotificationType;
  title: string;
  message: string;
  meta?: ReferralNotification['meta'];
  sendEmail?: boolean;
}

export async function createReferralNotification(
  input: CreateReferralNotificationInput
): Promise<ReferralNotification> {
  const notification: ReferralNotification = {
    id: `refnotif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userEmail: normalizeEmail(input.email),
    type: input.type,
    title: input.title,
    message: input.message,
    meta: input.meta,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const notifications = await readNotifications();
  notifications.unshift(notification);
  await writeNotifications(notifications);

  if (input.sendEmail) {
    const user = await getUserByEmail(notification.userEmail);
    await sendReferralProgramUpdateEmail(notification.userEmail, {
      name: user?.name,
      title: notification.title,
      message: notification.message,
    });
  }

  return notification;
}

export async function notifyPromoCodeUpdated(
  email: string,
  oldCode: string,
  newCode: string,
  changedBy: ReferralChangeSource
): Promise<void> {
  if (oldCode === newCode) return;

  await createReferralNotification({
    email,
    type: 'promo_code_updated',
    title: 'Promo code updated',
    message:
      changedBy === 'customer'
        ? `Your promo code was changed to ${newCode}.`
        : `Your Kush World promo code was updated from ${oldCode} to ${newCode}.`,
    meta: { oldValue: oldCode, newValue: newCode, changedBy },
    sendEmail: changedBy === 'admin',
  });
}

export async function notifyCommissionRateUpdated(
  email: string,
  oldPercent: number | null,
  newPercent: number | null,
  changedBy: ReferralChangeSource
): Promise<void> {
  const oldLabel = oldPercent === null ? 'site default' : `${oldPercent}%`;
  const newLabel = newPercent === null ? 'site default' : `${newPercent}%`;
  if (oldLabel === newLabel) return;

  await createReferralNotification({
    email,
    type: 'commission_rate_updated',
    title: 'Commission rate updated',
    message: `Your referral commission rate changed from ${oldLabel} to ${newLabel}.`,
    meta: { oldValue: oldPercent, newValue: newPercent, changedBy },
    sendEmail: changedBy === 'admin',
  });
}

export async function notifyRewardPointsUpdated(
  email: string,
  oldPoints: number | null,
  newPoints: number | null,
  changedBy: ReferralChangeSource
): Promise<void> {
  const oldLabel = oldPoints === null ? 'site default' : String(oldPoints);
  const newLabel = newPoints === null ? 'site default' : String(newPoints);
  if (oldLabel === newLabel) return;

  await createReferralNotification({
    email,
    type: 'reward_points_updated',
    title: 'Referral reward points updated',
    message: `Points you earn per referral changed from ${oldLabel} to ${newLabel}.`,
    meta: { oldValue: oldPoints, newValue: newPoints, changedBy },
    sendEmail: changedBy === 'admin',
  });
}

export async function notifyGlobalProgramUpdated(
  email: string,
  message: string,
  meta?: ReferralNotification['meta']
): Promise<void> {
  await createReferralNotification({
    email,
    type: 'global_program_updated',
    title: 'Referral program updated',
    message,
    meta: { ...meta, changedBy: 'admin' },
    sendEmail: true,
  });
}

export async function notifyReferralConversion(
  email: string,
  orderId: string,
  commissionAmount: number
): Promise<void> {
  await createReferralNotification({
    email,
    type: 'referral_conversion',
    title: 'New referral conversion',
    message: `Someone used your promo code on order ${orderId}. You earned $${commissionAmount.toFixed(2)} in commission.`,
    meta: { orderId, newValue: commissionAmount, changedBy: 'system' },
    sendEmail: true,
  });
}