import { readOrders } from '@/lib/ordersStore';

interface StoredOrder {
  email?: string;
  customer?: { email?: string };
  status?: string;
  items?: { id: string }[];
}

function orderEmail(order: StoredOrder): string {
  return (order.customer?.email || order.email || '').trim().toLowerCase();
}

function isQualifyingOrder(order: StoredOrder): boolean {
  const status = order.status?.toLowerCase();
  return status !== 'cancelled' && status !== 'refunded';
}

export async function customerHasPurchasedProduct(
  email: string,
  productId: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const orders = await readOrders<StoredOrder>();
  return orders.some(
    (order) =>
      isQualifyingOrder(order) &&
      orderEmail(order) === normalized &&
      (order.items || []).some((item) => item.id === productId)
  );
}

export async function customerHasAnyPurchase(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  const orders = await readOrders<StoredOrder>();
  return orders.some(
    (order) =>
      isQualifyingOrder(order) &&
      orderEmail(order) === normalized &&
      (order.items || []).length > 0
  );
}