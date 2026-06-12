import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isAdminRequest } from '@/lib/adminAuth';
import { getUserById } from '@/lib/users';
import { getUserIdImagePath } from '@/lib/verification';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId');
  const userId = request.nextUrl.searchParams.get('userId');

  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!orderId && !userId) {
    return NextResponse.json({ error: 'Order ID or user ID required' }, { status: 400 });
  }

  try {
    if (userId) {
      const user = await getUserById(userId);
      const filePath = await getUserIdImagePath(userId, user?.idVerification?.fileName);
      if (!filePath) {
        return NextResponse.json({ error: 'No ID on file for this member' }, { status: 404 });
      }

      const fileBuffer = await fs.readFile(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': user?.idVerification?.mimeType || 'image/jpeg',
          'Cache-Control': 'no-store',
        },
      });
    }

    const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(ordersData);
    const order = orders.find((o: { id: string }) => o.id === orderId);

    if (!order?.idVerification?.fileName) {
      return NextResponse.json({ error: 'No ID on file for this order' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'data', 'id-verifications', order.idVerification.fileName);
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': order.idVerification.mimeType || 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'ID image not found' }, { status: 404 });
  }
}