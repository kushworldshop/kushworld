import {
  isFirstOrderBonusLineItem,
  orderIncludesFreeEighth,
  type FirstOrderBonusLineItem,
} from '@/lib/firstOrderBonus';
import { readOrders } from '@/lib/ordersStore';
import { isEmailFirstOrder } from '@/lib/firstOrder';
import { getUserByEmail, type UserProfile } from '@/lib/users';

export async function hasReceivedFreeEighth(email: string | undefined): Promise<boolean> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;

  const user = await getUserByEmail(normalized);
  if (user?.freeEighthReceivedAt) return true;

  const orders = await readOrders<{
    status?: string;
    email?: string;
    customer?: { email?: string };
    freeEighthBonus?: boolean;
    items?: FirstOrderBonusLineItem[];
  }>();

  return orders.some((order) => {
    if (order.status === 'cancelled') return false;
    const orderEmail = (order.customer?.email || order.email || '').trim().toLowerCase();
    if (orderEmail !== normalized) return false;
    return order.freeEighthBonus === true || orderIncludesFreeEighth(order.items);
  });
}

export async function isEligibleForFreeEighth(
  email: string | undefined,
  hasHempItems: boolean
): Promise<boolean> {
  if (!hasHempItems) return false;
  if (!(await isEmailFirstOrder(email))) return false;
  if (await hasReceivedFreeEighth(email)) return false;
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