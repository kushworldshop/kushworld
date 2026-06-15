import fs from 'fs/promises';
import path from 'path';

const REACTIONS_FILE = path.join(process.cwd(), 'data', 'product-reactions.json');

export interface ProductReactions {
  [productId: string]: Record<string, number>;
}

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
}

async function ensureReactionsFile() {
  await ensureDataDir();
  try {
    await fs.access(REACTIONS_FILE);
  } catch {
    await fs.writeFile(REACTIONS_FILE, JSON.stringify({}, null, 2));
  }
}

export async function getProductReactions(): Promise<ProductReactions> {
  await ensureReactionsFile();
  const data = await fs.readFile(REACTIONS_FILE, 'utf8');
  return JSON.parse(data);
}

export async function getReactionsForProduct(productId: string): Promise<Record<string, number>> {
  const all = await getProductReactions();
  return all[productId] || {};
}

export async function addProductReaction(productId: string, emote: string): Promise<Record<string, number>> {
  await ensureReactionsFile();
  const all = await getProductReactions();
  if (!all[productId]) all[productId] = {};
  all[productId][emote] = (all[productId][emote] || 0) + 1;

  await fs.writeFile(REACTIONS_FILE, JSON.stringify(all, null, 2));
  return all[productId];
}
