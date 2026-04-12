import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ordersFile = path.join(process.cwd(), 'data', 'orders.json');

// Ensure data folder and file exist
function ensureDataFile() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, JSON.stringify([], null, 2));
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureDataFile();

    const body = await request.json();
    const { orderId, items, customerInfo, paymentMethod, total } = body;

    const newOrder = {
      orderId,
      date: new Date().toISOString(),
      status: 'pending', // pending → paid → shipped
      items,
      customerInfo,
      paymentMethod,
      total,
      notes: ''
    };

    const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
    orders.push(newOrder);
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Order saved successfully. We will verify payment manually.',
      orderId 
    });
  } catch (error) {
    console.error('Order save error:', error);
    return NextResponse.json({ success: false, message: 'Failed to save order' }, { status: 500 });
  }
}

export async function GET() {
  try {
    ensureDataFile();
    const orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json([]);
  }
}