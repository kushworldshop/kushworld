import {
  isFirstOrderBonusLineItem,
  orderIncludesFreeEighth,
  type FirstOrderBonusLineItem,
} from '@/lib/firstOrderBonus';
import { readOrders } from '@/lib/ordersStore';
import { isEmailFirstOrder } from '@/lib/firstOrder';
import { getUserByEmail, readUsers, type UserProfile } from '@/lib/users';
import { normalizePhone } from '@/lib/accountVerification';

export async function hasReceivedFreeEighth(email: string | undefined, phone?: string): Promise<boolean> {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  if (!normalizedEmail && !normalizedPhone) return false;

  // Check users by email or phone
  const users = await readUsers();
  const matchingUser = users.find((u) => {
    const uEmail = u.email.toLowerCase();
    const uPhone = u.phone ? normalizePhone(u.phone) : null;
    return (normalizedEmail && uEmail === normalizedEmail) || (normalizedPhone && uPhone === normalizedPhone);
  });
  if (matchingUser?.freeEighthReceivedAt) return true;

  const orders = await readOrders<{
    status?: string;
    email?: string;
    customer?: { email?: string; phone?: string };
    phone?: string;
    freeEighthBonus?: boolean;
    items?: FirstOrderBonusLineItem[];
  }>();

  return orders.some((order) => {
    if (order.status === 'cancelled') return false;
    const orderEmail = (order.customer?.email || order.email || '').trim().toLowerCase();
    if (normalizedEmail && orderEmail === normalizedEmail) {
      return order.freeEighthBonus === true || orderIncludesFreeEighth(order.items);
    }
    const orderPhone = order.phone || order.customer?.phone || '';
    const normOrderPhone = orderPhone ? normalizePhone(orderPhone) : null;
    if (normalizedPhone && normOrderPhone === normalizedPhone) {
      return order.freeEighthBonus === true || orderIncludesFreeEighth(order.items);
    }
    return false;
  });
}

export async function isEligibleForFreeEighth(
  email: string | undefined,
  hasHempItems: boolean,
  phone?: string
): Promise<boolean> {
  if (!hasHempItems) return false;
  if (!(await isEmailFirstOrder(email, phone))) return false;
  if (await hasReceivedFreeEighth(email, phone)) return false;
  return true;
}

export interface FreeEighthRecipient {
  email: string;
  name?: string;
  userId?: string;
  orderId: string;
  orderStatus?: string;
  grantedAt: string;
  orderTotal?: number;
}

export async function listFreeEighthRecipients(): Promise<FreeEighthRecipient[]> {
  const orders = await readOrders<{
    id: string;
    status?: string;
    createdAt?: string;
    total?: number;
    email?: string;
    name?: string;
    customer?: { email?: string; name?: string };
    freeEighthBonus?: boolean;
    items?: FirstOrderBonusLineItem[];
  }>();

  const recipients: FreeEighthRecipient[] = [];

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const includesBonus =
      order.freeEighthBonus === true || orderIncludesFreeEighth(order.items);
    if (!includesBonus) continue;

    const email = (order.customer?.email || order.email || '').trim().toLowerCase();
    if (!email) continue;

    const user = await getUserByEmail(email);

    recipients.push({
      email,
      name: order.customer?.name || order.name || user?.name,
      userId: user?.id,
      orderId: order.id,
      orderStatus: order.status,
      grantedAt: order.createdAt || new Date().toISOString(),
      orderTotal: order.total,
    });
  }

  return recipients.sort(
    (a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime()
  );
}

export async function markFreeEighthGranted(
  email: string | undefined,
  orderId: string,
  userId?: string
): Promise<void> {
  const { markUserFreeEighthGranted, markUserFreeEighthGrantedByEmail } = await import(
    '@/lib/users'
  );

  if (userId) {
    await markUserFreeEighthGranted(userId, orderId);
    return;
  }

  if (email) {
    await markUserFreeEighthGrantedByEmail(email, orderId);
  }
}

export function userReceivedFreeEighth(user: Pick<UserProfile, 'freeEighthReceivedAt'>): boolean {
  return !!user.freeEighthReceivedAt;
}

export { isFirstOrderBonusLineItem, orderIncludesFreeEighth };