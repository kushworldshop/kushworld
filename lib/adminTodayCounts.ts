import { getAbandonedCartSummary } from '@/lib/abandonedCarts';
import { getAdminOrderBucket } from '@/lib/adminOrderBuckets';
import type { StaffPermission, StaffRole } from '@/lib/adminPermissions';
import {
  ADMIN_TODAY_DEFS,
  type AdminTodayItem,
  type AdminTodayItemId,
} from '@/lib/adminToday';
import { orderNeedsPaymentConfirmation } from '@/lib/paymentMethods';
import { readOrders } from '@/lib/ordersStore';
import { listAllSubmissions } from '@/lib/socialRewards';
import { listAllTdSubmissions } from '@/lib/tdRewards';
import { readUsers } from '@/lib/users';

function canPermission(
  permission: StaffPermission,
  role: StaffRole,
  permissions: StaffPermission[]
): boolean {
  return role === 'owner' || role === 'admin' || permissions.includes(permission);
}

export async function getAdminTodayItems(
  role: StaffRole,
  permissions: StaffPermission[]
): Promise<AdminTodayItem[]> {
  const needOrders = canPermission('orders', role, permissions);
  const needMembers = canPermission('members', role, permissions);
  const needSocial = canPermission('social', role, permissions);
  const needCarts = canPermission('carts', role, permissions);

  const [orders, users, social, td, abandoned] = await Promise.all([
    needOrders
      ? readOrders<{
          status?: string;
          paymentStatus?: string;
          paymentMethod?: string;
          idVerification?: { status?: string };
        }>()
      : Promise.resolve([]),
    needMembers ? readUsers() : Promise.resolve([]),
    needSocial ? listAllSubmissions({ status: 'pending', limit: 1 }) : Promise.resolve(null),
    needSocial ? listAllTdSubmissions(1) : Promise.resolve(null),
    needCarts ? getAbandonedCartSummary() : Promise.resolve(null),
  ]);

  const newCount = orders.filter((order) => getAdminOrderBucket(order) === 'new').length;
  const unpaidCount = orders.filter(
    (order) =>
      orderNeedsPaymentConfirmation(order) &&
      getAdminOrderBucket(order) !== 'completed' &&
      getAdminOrderBucket(order) !== 'refunded'
  ).length;
  const idCount = users.filter((user) => user.idVerification?.status === 'uploaded').length;
  const tdCount = (social?.pendingCount ?? 0) + (td?.unmatched?.length ?? 0);
  const cartCount = abandoned?.abandonedCount ?? 0;

  const counts: Record<AdminTodayItemId, number> = {
    'new-orders': newCount,
    unpaid: unpaidCount,
    'id-review': idCount,
    tds: tdCount,
    carts: cartCount,
  };

  return ADMIN_TODAY_DEFS.filter((item) => canPermission(item.permission, role, permissions)).map(
    (item) => ({
      ...item,
      count: counts[item.id],
    })
  );
}
