import fs from 'fs/promises';
import path from 'path';
import type { Product } from '@/lib/products';
import { getProductSlug } from '@/lib/products';
import {
  applyFlowerProductOptions,
  isFlowerProductCategory,
  stripFlowerWeightOptionGroups,
} from '@/lib/flowerWeights';
import { sanitizeTierPricing } from '@/lib/tierPricing';

const CUSTOM_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'custom-products.json');
const DELETED_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'deleted-product-ids.json');

interface DeletedProductsFile {
  ids: string[];
  updatedAt: string;
}

async function readDeletedProductIds(): Promise<string[]> {
  try {
    const raw = await fs.readFile(DELETED_PRODUCTS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DeletedProductsFile>;
    return Array.isArray(parsed.ids) ? parsed.ids.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

async function writeDeletedProductIds(ids: string[]): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  const unique = [...new Set(ids.filter(isCustomProductId))];
  const payload: DeletedProductsFile = {
    ids: unique,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(DELETED_PRODUCTS_FILE, JSON.stringify(payload, null, 2));
}

async function ensureCustomProductsFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(CUSTOM_PRODUCTS_FILE);
  } catch {
    await fs.writeFile(CUSTOM_PRODUCTS_FILE, JSON.stringify([], null, 2));
  }
}

export async function readCustomProducts(): Promise<Product[]> {
  await ensureCustomProductsFile();
  const data = await fs.readFile(CUSTOM_PRODUCTS_FILE, 'utf8');
  const products = JSON.parse(data) as Product[];
  const deleted = new Set(await readDeletedProductIds());
  if (deleted.size === 0) return products;
  const kept = products.filter((product) => !deleted.has(product.id));
  if (kept.length !== products.length) {
    await fs.writeFile(CUSTOM_PRODUCTS_FILE, JSON.stringify(kept, null, 2));
  }
  return kept;
}

export async function writeCustomProducts(products: Product[]): Promise<void> {
  await ensureCustomProductsFile();
  const deleted = new Set(await readDeletedProductIds());
  const next = deleted.size > 0 ? products.filter((product) => !deleted.has(product.id)) : products;
  await fs.writeFile(CUSTOM_PRODUCTS_FILE, JSON.stringify(next, null, 2));
}

export function isCustomProductId(id: string): boolean {
  return id.startsWith('custom-');
}

export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildCustomProductId(name: string): string {
  return `custom-${slugifyProductName(name)}`;
}

export function parseFlowerImageFilename(filename: string): { strain: string; kind: 'hand' | 'bag' } | null {
  const base = filename.replace(/\.[^.]+$/i, '').trim();
  const handMatch = base.match(/^(.+?)\s+hand$/i);
  if (handMatch) return { strain: handMatch[1].trim(), kind: 'hand' };
  const bagMatch = base.match(/^(.+?)\s+bag$/i);
  if (bagMatch) return { strain: bagMatch[1].trim(), kind: 'bag' };
  return null;
}

export async function createCustomProduct(input: Omit<Product, 'id'> & { id?: string }): Promise<Product> {
  const products = await readCustomProducts();
  const id = input.id || buildCustomProductId(input.name);
  if (products.some((product) => product.id === id)) {
    throw new Error(`Product already exists: ${input.name}`);
  }
  const deleted = await readDeletedProductIds();
  if (deleted.includes(id)) {
    await writeDeletedProductIds(deleted.filter((value) => value !== id));
  }

  const product: Product = applyFlowerProductOptions({
    ...input,
    id,
    slug: input.slug || slugifyProductName(input.name),
    isNew: input.isNew ?? true,
  });

  products.push(product);
  await writeCustomProducts(products);
  return product;
}

export type CustomProductUpdate = Partial<
  Pick<
    Product,
    | 'name'
    | 'price'
    | 'cost'
    | 'inventory'
    | 'image'
    | 'images'
    | 'media'
    | 'description'
    | 'optionGroups'
    | 'hidden'
    | 'category'
    | 'subcategory'
    | 'merchSubcategory'
    | 'compareAtPrice'
    | 'featured'
    | 'bestSeller'
    | 'isNew'
    | 'tierPricing'
    | 'hideBulkPricing'
    | 'thcaPercent'
    | 'strainType'
    | 'tier'
    | 'effects'
    | 'priceMarkup'
  >
> & { clearInventory?: boolean; clearTierPricing?: boolean };

export async function updateCustomProduct(
  id: string,
  updates: CustomProductUpdate
): Promise<Product | null> {
  const products = await readCustomProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return null;

  const current = products[index];
  const next: Product = { ...current };

  if (updates.name !== undefined) next.name = updates.name.trim() || current.name;
  if (updates.price !== undefined) next.price = Math.max(0, Number(updates.price));
  if (updates.cost !== undefined) {
    const cost = Math.max(0, Number(updates.cost));
    if (cost > 0) next.cost = cost;
    else delete next.cost;
  }
  if (updates.priceMarkup !== undefined) {
    if (updates.priceMarkup === 2 || updates.priceMarkup === 3) next.priceMarkup = updates.priceMarkup;
    else delete next.priceMarkup;
  }
  if (updates.clearInventory) {
    delete next.inventory;
    delete next.inStock;
  } else if (updates.inventory !== undefined) {
    next.inventory = Math.max(0, Math.floor(Number(updates.inventory)));
    next.inStock = next.inventory > 0;
  }
  if (updates.image !== undefined) next.image = updates.image.trim() || current.image;
  if (updates.images !== undefined) next.images = updates.images;
  if (updates.media !== undefined) {
    if (updates.media.length > 0) next.media = updates.media;
    else delete next.media;
  }
  if (updates.description !== undefined) {
    const desc = updates.description.trim();
    if (desc) next.description = desc;
    else delete next.description;
  }
  if (updates.optionGroups !== undefined) {
    if (updates.optionGroups.length > 0) next.optionGroups = updates.optionGroups;
    else delete next.optionGroups;
  }
  if (updates.hidden !== undefined) {
    if (updates.hidden) next.hidden = true;
    else delete next.hidden;
  }
  if (updates.category !== undefined) {
    const category = updates.category.trim();
    if (category) next.category = category;
  }
  if (updates.subcategory !== undefined) {
    const subcategory = updates.subcategory.trim();
    if (subcategory) next.subcategory = subcategory;
    else delete next.subcategory;
  }
  if (updates.merchSubcategory !== undefined) {
    const merchSubcategory = updates.merchSubcategory.trim();
    if (merchSubcategory) next.merchSubcategory = merchSubcategory;
    else delete next.merchSubcategory;
  }
  if (updates.compareAtPrice !== undefined) {
    const compareAt = Math.max(0, Number(updates.compareAtPrice));
    if (compareAt > 0) next.compareAtPrice = compareAt;
    else delete next.compareAtPrice;
  }
  if (updates.featured !== undefined) {
    if (updates.featured) next.featured = true;
    else delete next.featured;
  }
  if (updates.bestSeller !== undefined) {
    if (updates.bestSeller) next.bestSeller = true;
    else delete next.bestSeller;
  }
  if (updates.isNew !== undefined) {
    if (updates.isNew) next.isNew = true;
    else delete next.isNew;
  }
  if (updates.clearTierPricing) {
    delete next.tierPricing;
  } else if (updates.tierPricing !== undefined) {
    const cleanedTiers = sanitizeTierPricing(updates.tierPricing);
    if (cleanedTiers.length > 0) next.tierPricing = cleanedTiers;
    else delete next.tierPricing;
  }
  if (updates.hideBulkPricing !== undefined) {
    if (updates.hideBulkPricing) next.hideBulkPricing = true;
    else delete next.hideBulkPricing;
  }
  if (updates.thcaPercent !== undefined) {
    const thca = Math.max(0, Number(updates.thcaPercent));
    if (thca > 0) next.thcaPercent = thca;
    else delete next.thcaPercent;
  }
  if (updates.strainType !== undefined) {
    const strainType = updates.strainType.trim();
    if (strainType) next.strainType = strainType;
    else delete next.strainType;
  }
  if (updates.tier !== undefined) {
    const tier = updates.tier.trim();
    if (tier) next.tier = tier;
    else delete next.tier;
  }
  if (updates.effects !== undefined) {
    const effects = updates.effects.map((value) => value.trim()).filter(Boolean);
    if (effects.length > 0) next.effects = effects;
    else delete next.effects;
  }

  if (isFlowerProductCategory(next.category)) {
    Object.assign(next, applyFlowerProductOptions(next));
  } else if (
    updates.category !== undefined &&
    !isFlowerProductCategory(next.category)
  ) {
    const stripped = stripFlowerWeightOptionGroups(next.optionGroups);
    if (stripped) next.optionGroups = stripped;
    else delete next.optionGroups;
  }

  products[index] = next;
  await writeCustomProducts(products);
  return next;
}

export async function getCustomProductById(id: string): Promise<Product | undefined> {
  const products = await readCustomProducts();
  return products.find((product) => product.id === id);
}

export async function deleteCustomProducts(ids: string[]): Promise<number> {
  const idSet = new Set(ids.filter(isCustomProductId));
  if (idSet.size === 0) return 0;

  const products = await readCustomProducts();
  const next = products.filter((product) => !idSet.has(product.id));
  const removed = products.length - next.length;
  const deleted = await readDeletedProductIds();
  await writeDeletedProductIds([...deleted, ...idSet]);
  if (removed > 0) await writeCustomProducts(next);
  return removed;
}

export function getCustomProductSlug(product: Product): string {
  return product.slug || getProductSlug(product);
}