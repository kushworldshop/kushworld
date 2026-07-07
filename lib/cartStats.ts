import fs from 'fs/promises';
import path from 'path';
import type { CartItem } from '@/lib/cartStore';

const ENTRIES_FILE = path.join(process.cwd(), 'data', 'cart-entries.json');

export interface CartSnapshotItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  selectedOptions?: CartItem['selectedOptions'];
  selectedSize?: string;
  optionSkus?: string;
  category?: string;
  isFirstOrderBonus?: boolean;
}

export interface CartSnapshot {
  ownerKey: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  isGuest: boolean;
  guestTrackId?: string;
  items: CartSnapshotItem[];
  subtotal: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  reminderSentAt?: string;
}

interface CartEntriesFile {
  carts: CartSnapshot[];
  updatedAt: string;
}

const EMPTY_FILE: CartEntriesFile = {
  carts: [],
  updatedAt: new Date().toISOString(),
};

async function ensureEntriesFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(ENTRIES_FILE);
  } catch {
    await fs.writeFile(ENTRIES_FILE, JSON.stringify(EMPTY_FILE, null, 2));
  }
}

export async function readCartEntries(): Promise<CartEntriesFile> {
  await ensureEntriesFile();
  const data = await fs.readFile(ENTRIES_FILE, 'utf8');
  const parsed = JSON.parse(data) as Partial<CartEntriesFile>;
  return {
    carts: Array.isArray(parsed.carts) ? parsed.carts : [],
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
  };
}

async function writeCartEntries(file: CartEntriesFile): Promise<void> {
  await ensureEntriesFile();
  await fs.writeFile(ENTRIES_FILE, JSON.stringify(file, null, 2));
}

function isPaidItem(item: CartSnapshotItem): boolean {
  return !item.isFirstOrderBonus;
}

function calcSubtotal(items: CartSnapshotItem[]): number {
  return items
    .filter(isPaidItem)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function calcItemCount(items: CartSnapshotItem[]): number {
  return items.filter(isPaidItem).reduce((sum, item) => sum + item.quantity, 0);
}

function sanitizeItems(items: unknown): CartSnapshotItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const row = item as Partial<CartSnapshotItem>;
      return {
        id: String(row.id ?? ''),
        name: String(row.name ?? 'Unknown item'),
        price: Number(row.price) || 0,
        image: String(row.image ?? ''),
        quantity: Math.max(1, Number(row.quantity) || 1),
        selectedOptions: row.selectedOptions,
        selectedSize: row.selectedSize,
        optionSkus: row.optionSkus,
        category: row.category,
        isFirstOrderBonus: Boolean(row.isFirstOrderBonus),
      };
    })
    .filter((item) => item.id && item.name);
}

export async function upsertCartSnapshot(input: {
  ownerKey: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  isGuest: boolean;
  guestTrackId?: string;
  items: unknown;
}): Promise<CartSnapshot | null> {
  const items = sanitizeItems(input.items);
  const file = await readCartEntries();
  const now = new Date().toISOString();
  const existingIndex = file.carts.findIndex((cart) => cart.ownerKey === input.ownerKey);

  if (items.length === 0) {
    if (existingIndex >= 0) {
      file.carts.splice(existingIndex, 1);
      file.updatedAt = now;
      await writeCartEntries(file);
    }
    return null;
  }

  const snapshot: CartSnapshot = {
    ownerKey: input.ownerKey,
    userId: input.userId,
    userEmail: input.userEmail,
    userName: input.userName,
    isGuest: input.isGuest,
    guestTrackId: input.guestTrackId,
    items,
    subtotal: calcSubtotal(items),
    itemCount: calcItemCount(items),
    createdAt: existingIndex >= 0 ? file.carts[existingIndex].createdAt : now,
    updatedAt: now,
    reminderSentAt: existingIndex >= 0 ? file.carts[existingIndex].reminderSentAt : undefined,
  };

  if (existingIndex >= 0) {
    file.carts[existingIndex] = snapshot;
  } else {
    file.carts.push(snapshot);
  }

  file.updatedAt = now;
  await writeCartEntries(file);
  return snapshot;
}

export async function clearCartSnapshot(ownerKey: string): Promise<boolean> {
  const file = await readCartEntries();
  const before = file.carts.length;
  file.carts = file.carts.filter((cart) => cart.ownerKey !== ownerKey);

  if (file.carts.length === before) return false;

  file.updatedAt = new Date().toISOString();
  await writeCartEntries(file);
  return true;
}

export async function getActiveCarts(limit = 100): Promise<{
  carts: CartSnapshot[];
  totalCarts: number;
  totalItems: number;
  totalValue: number;
  loggedInCarts: number;
  guestCarts: number;
  updatedAt: string;
}> {
  const file = await readCartEntries();
  const carts = file.carts
    .filter((cart) => cart.items.length > 0)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);

  const totalItems = carts.reduce((sum, cart) => sum + cart.itemCount, 0);
  const totalValue = carts.reduce((sum, cart) => sum + cart.subtotal, 0);
  const loggedInCarts = carts.filter((cart) => !cart.isGuest).length;
  const guestCarts = carts.filter((cart) => cart.isGuest).length;

  return {
    carts,
    totalCarts: carts.length,
    totalItems,
    totalValue,
    loggedInCarts,
    guestCarts,
    updatedAt: file.updatedAt,
  };
}