'use server';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

// Ensure data folder and file exist
async function ensureOrdersFile() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
  }
}

// GET all orders (for admin)
export async function GET() {
  await ensureOrdersFile();
  const data = await fs.readFile(ORDERS_FILE, 'utf8');
  const orders = JSON.parse(data);
  return NextResponse.json(orders);
}

// PATCH order status (for admin)
export async function PATCH(request: NextRequest) {
  try {
    await ensureOrdersFile();
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Order id and status required' }, { status: 400 });
    }

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    const index = orders.findIndex((order: { id: string }) => order.id === id);

    if (index === -1) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    orders[index].status = status;
    orders[index].updatedAt = new Date().toISOString();
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    return NextResponse.json({ success: true, order: orders[index] });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 });
  }
}

// POST new order (from checkout)
export async function POST(request: NextRequest) {
  try {
    await ensureOrdersFile();
    const body = await request.json();
    const customer = body.customer ?? {};
    
    const newOrder = {
      id: `KW-${Date.now().toString().slice(-8)}`,
      ...body,
      email: customer.email ?? body.email,
      name: customer.name ?? body.name,
      address: customer.address ?? body.address,
      city: customer.city ?? body.city,
      state: customer.state ?? body.state,
      zip: customer.zip ?? body.zip,
      phone: customer.phone ?? body.phone,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const data = await fs.readFile(ORDERS_FILE, 'utf8');
    const orders = JSON.parse(data);
    orders.unshift(newOrder); // newest first
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));

    return NextResponse.json({ success: true, orderId: newOrder.id });
  } catch (error) {
    console.error('Order save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save order' }, { status: 500 });
  }
}