import { readOrders } from '@/lib/ordersStore';

interface StoredOrder {
  email?: string;
  status?: string;
  items?: { id: string }[];
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
      order.email?.trim().toLowerCase() === normalized &&
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
      order.email?.trim().toLowerCase() === normalized &&
      (order.items || []).length > 0
  );
}