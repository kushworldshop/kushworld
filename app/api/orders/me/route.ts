import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getSessionUserId } from '@/lib/auth';
import { getUserById } from '@/lib/users';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  try {
    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    const myOrders = orders
      .filter((order: { email?: string; customer?: { email?: string } }) => {
        const orderEmail = order.customer?.email || order.email;
        return orderEmail?.toLowerCase() === user.email.toLowerCase();
      })
      .sort(
        (a: { createdAt?: string }, b: { createdAt?: string }) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

    return NextResponse.json({ success: true, orders: myOrders });
  } catch {
    return NextResponse.json({ success: true, orders: [] });
  }
}