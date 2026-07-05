import fs from 'fs/promises';
import path from 'path';

const ENTRIES_FILE = path.join(process.cwd(), 'data', 'wishlist-entries.json');

export interface WishlistEntry {
  userId: string;
  userEmail: string;
  userName: string;
  productId: string;
  productName: string;
  productImage: string;
  productCategory?: string;
  productPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistUserSummary {
  userId: string;
  email: string;
  name: string;
  wishlistedAt: string;
}

export interface WishlistProductStat {
  id: string;
  name: string;
  image: string;
  category?: string;
  price?: number;
  count: number;
  lastWishlistedAt: string;
  wishlisters: WishlistUserSummary[];
}

interface WishlistEntriesFile {
  entries: WishlistEntry[];
  updatedAt: string;
}

const EMPTY_FILE: WishlistEntriesFile = {
  entries: [],
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

export async function readWishlistEntries(): Promise<WishlistEntriesFile> {
  await ensureEntriesFile();
  const data = await fs.readFile(ENTRIES_FILE, 'utf8');
  const parsed = JSON.parse(data) as Partial<WishlistEntriesFile>;
  return {
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    updatedAt: parsed.updatedAt ?? new Date().toISOString(),
  };
}

async function writeWishlistEntries(file: WishlistEntriesFile): Promise<void> {
  await ensureEntriesFile();
  await fs.writeFile(ENTRIES_FILE, JSON.stringify(file, null, 2));
}

function entryKey(userId: string, productId: string): string {
  return `${userId}:${productId}`;
}

export async function addWishlistEntry(input: {
  userId: string;
  userEmail: string;
  userName: string;
  product: {
    id: string;
    name: string;
    image: string;
    category?: string;
    price?: number;
  };
}): Promise<WishlistEntry> {
  const file = await readWishlistEntries();
  const now = new Date().toISOString();
  const existingIndex = file.entries.findIndex(
    (entry) => entry.userId === input.userId && entry.productId === input.product.id
  );

  const entry: WishlistEntry = {
    userId: input.userId,
    userEmail: input.userEmail,
    userName: input.userName,
    productId: input.product.id,
    productName: input.product.name,
    productImage: input.product.image,
    productCategory: input.product.category,
    productPrice: input.product.price,
    createdAt: existingIndex >= 0 ? file.entries[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    file.entries[existingIndex] = entry;
  } else {
    file.entries.push(entry);
  }

  file.updatedAt = now;
  await writeWishlistEntries(file);
  return entry;
}

export async function removeWishlistEntry(userId: string, productId: string): Promise<boolean> {
  const file = await readWishlistEntries();
  const before = file.entries.length;
  file.entries = file.entries.filter(
    (entry) => !(entry.userId === userId && entry.productId === productId)
  );

  if (file.entries.length === before) return false;

  file.updatedAt = new Date().toISOString();
  await writeWishlistEntries(file);
  return true;
}

export async function getWishlistItemsForUser(userId: string): Promise<
  Array<{
    id: string;
    name: string;
    price: number;
    image: string;
    category?: string;
    wishlistedAt: string;
  }>
> {
  const file = await readWishlistEntries();
  return file.entries
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((entry) => ({
      id: entry.productId,
      name: entry.productName,
      price: entry.productPrice ?? 0,
      image: entry.productImage,
      category: entry.productCategory,
      wishlistedAt: entry.updatedAt,
    }));
}

export async function getPopularWishlistProducts(limit = 50): Promise<{
  products: WishlistProductStat[];
  totalWishlists: number;
  uniqueProducts: number;
  uniqueCustomers: number;
  updatedAt: string;
}> {
  const file = await readWishlistEntries();
  const grouped = new Map<string, WishlistProductStat>();

  for (const entry of file.entries) {
    const existing = grouped.get(entry.productId);
    const userSummary: WishlistUserSummary = {
      userId: entry.userId,
      email: entry.userEmail,
      name: entry.userName,
      wishlistedAt: entry.updatedAt,
    };

    if (existing) {
      const alreadyListed = existing.wishlisters.some((user) => user.userId === entry.userId);
      if (!alreadyListed) {
        existing.wishlisters.push(userSummary);
        existing.count = existing.wishlisters.length;
      }
      if (entry.updatedAt > existing.lastWishlistedAt) {
        existing.lastWishlistedAt = entry.updatedAt;
      }
      existing.name = entry.productName;
      existing.image = entry.productImage;
      existing.category = entry.productCategory;
      existing.price = entry.productPrice;
    } else {
      grouped.set(entry.productId, {
        id: entry.productId,
        name: entry.productName,
        image: entry.productImage,
        category: entry.productCategory,
        price: entry.productPrice,
        count: 1,
        lastWishlistedAt: entry.updatedAt,
        wishlisters: [userSummary],
      });
    }
  }

  const products = Array.from(grouped.values())
    .sort((a, b) => b.count - a.count || b.lastWishlistedAt.localeCompare(a.lastWishlistedAt))
    .slice(0, limit);

  const uniqueCustomers = new Set(file.entries.map((entry) => entry.userId)).size;

  return {
    products,
    totalWishlists: file.entries.length,
    uniqueProducts: grouped.size,
    uniqueCustomers,
    updatedAt: file.updatedAt,
  };
}

/** @deprecated Use addWishlistEntry with authenticated user */
export async function recordWishlistAdd(): Promise<void> {
  // Legacy anonymous tracking removed — wishlists require accounts.
}