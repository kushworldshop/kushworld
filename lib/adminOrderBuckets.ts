export type AdminOrderBucket = 'new' | 'pending' | 'completed' | 'refunded';

export interface AdminOrderBucketMeta {
  id: AdminOrderBucket;
  label: string;
  description: string;
}

export const ADMIN_ORDER_BUCKETS: AdminOrderBucketMeta[] = [
  {
    id: 'new',
    label: 'New',
    description: 'Fresh orders needing payment, ID review, or first action',
  },
  {
    id: 'pending',
    label: 'Pending',
    description: 'Paid and in progress — processing or ready to ship',
  },
  {
    id: 'completed',
    label: 'Completed',
    description: 'Shipped or delivered successfully',
  },
  {
    id: 'refunded',
    label: 'Refunded',
    description: 'Cancelled or refunded orders',
  },
];

export function getAdminOrderBucket(order: {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  idVerification?: { status?: string };
}): AdminOrderBucket {
  const status = (order.status || 'pending').toLowerCase();

  if (status === 'cancelled' || status === 'refunded') {
    return 'refunded';
  }

  if (status === 'delivered' || status === 'shipped') {
    return 'completed';
  }

  if (status === 'processing' || status === 'packing' || status === 'sealed' || status === 'quality') {
    return 'pending';
  }

  if (order.idVerification?.status === 'uploaded') {
    return 'new';
  }

  if (order.paymentMethod === 'btc' && order.paymentStatus === 'awaiting_btc') {
    return 'new';
  }

  if (order.paymentStatus === 'paid') {
    return 'pending';
  }

  return 'new';
}

export function sortOrdersForAdmin<T extends { createdAt?: string }>(orders: T[]): T[] {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export function groupOrdersByBucket<
  T extends Parameters<typeof getAdminOrderBucket>[0] & { createdAt?: string },
>(orders: T[]): Record<AdminOrderBucket, T[]> {
  const grouped: Record<AdminOrderBucket, T[]> = {
    new: [],
    pending: [],
    completed: [],
    refunded: [],
  };

  for (const order of sortOrdersForAdmin(orders)) {
    grouped[getAdminOrderBucket(order)].push(order);
  }

  return grouped;
}