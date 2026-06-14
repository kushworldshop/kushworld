import { readOrders } from '@/lib/ordersStore';
import { normalizePhone } from '@/lib/accountVerification';

export async function isEmailFirstOrder(email: string | undefined, phone?: string): Promise<boolean> {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  if (!normalizedEmail && !normalizedPhone) return true;

  const orders = await readOrders<{
    status?: string;
    email?: string;
    customer?: { email?: string; phone?: string };
    phone?: string;
  }>();

  return !orders.some((order) => {
    if (order.status === 'cancelled') return false;
    const orderEmail = (order.customer?.email || order.email || '').trim().toLowerCase();
    if (normalizedEmail && orderEmail === normalizedEmail) return true;
    const orderPhone = order.phone || order.customer?.phone || '';
    const normOrderPhone = orderPhone ? normalizePhone(orderPhone) : null;
    if (normalizedPhone && normOrderPhone === normalizedPhone) return true;
    return false;
  });
}