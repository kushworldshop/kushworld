import fs from 'fs/promises';
import path from 'path';

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

export async function ensureOrdersFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.writeFile(ORDERS_FILE, JSON.stringify([], null, 2));
  }
}

export async function readOrders<T = Record<string, unknown>>(): Promise<T[]> {
  await ensureOrdersFile();
  const data = await fs.readFile(ORDERS_FILE, 'utf8');
  return JSON.parse(data) as T[];
}

export async function writeOrders<T = Record<string, unknown>>(orders: T[]) {
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

export async function getOrderById<T extends { id: string }>(orderId: string): Promise<T | null> {
  const orders = await readOrders<T>();
  return orders.find((order) => order.id === orderId) ?? null;
}

export async function updateOrderById<T extends { id: string }>(
  orderId: string,
  updater: (order: T) => T
): Promise<T | null> {
  const orders = await readOrders<T>();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index === -1) return null;
  orders[index] = updater(orders[index]);
  await writeOrders(orders);
  return orders[index];
}