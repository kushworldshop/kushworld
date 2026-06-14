import { readOrders } from '@/lib/ordersStore';

export async function isEmailFirstOrder(email: string | undefined): Promise<boolean> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return true;

  const orders = await readOrders<{
    status?: string;
    email?: string;
    customer?: { email?: string };
  }>();

  return !orders.some((order) => {
    const orderEmail = (order.customer?.email || order.email || '').trim().toLowerCase();
    if (orderEmail !== normalized) return false;
    return order.status !== 'cancelled';
  });
}