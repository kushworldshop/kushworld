import fs from 'fs/promises';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'data', 'wishlist-stats.json');

export interface WishlistProductStat {
  id: string;
  name: string;
  image: string;
  category?: string;
  count: number;
  lastWishlistedAt: string;
}

export interface WishlistStatsFile {
  products: Record<string, WishlistProductStat>;
  updatedAt: string;
}

const EMPTY_STATS: WishlistStatsFile = {
  products: {},
  updatedAt: new Date().toISOString(),
};

async function ensureStatsFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(STATS_FILE);
  } catch {
    await fs.writeFile(STATS_FILE, JSON.stringify(EMPTY_STATS, null, 2));
  }
}

export async function readWishlistStats(): Promise<WishlistStatsFile> {
  await ensureStatsFile();
  const data = await fs.readFile(STATS_FILE, 'utf8');
  return { ...EMPTY_STATS, ...JSON.parse(data) };
}

async function writeWishlistStats(stats: WishlistStatsFile): Promise<void> {
  await ensureStatsFile();
  await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2));
}

export async function recordWishlistAdd(input: {
  id: string;
  name: string;
  image: string;
  category?: string;
}): Promise<void> {
  const stats = await readWishlistStats();
  const existing = stats.products[input.id];
  const now = new Date().toISOString();

  stats.products[input.id] = {
    id: input.id,
    name: input.name,
    image: input.image,
    category: input.category,
    count: (existing?.count ?? 0) + 1,
    lastWishlistedAt: now,
  };
  stats.updatedAt = now;

  await writeWishlistStats(stats);
}

export async function getPopularWishlistProducts(limit = 50): Promise<{
  products: WishlistProductStat[];
  totalWishlists: number;
  uniqueProducts: number;
  updatedAt: string;
}> {
  const stats = await readWishlistStats();
  const allProducts = Object.values(stats.products);
  const totalWishlists = allProducts.reduce((sum, product) => sum + product.count, 0);
  const products = allProducts
    .sort((a, b) => b.count - a.count || b.lastWishlistedAt.localeCompare(a.lastWishlistedAt))
    .slice(0, limit);

  return {
    products,
    totalWishlists,
    uniqueProducts: Object.keys(stats.products).length,
    updatedAt: stats.updatedAt,
  };
}