import fs from 'fs/promises';
import path from 'path';
import type { Product } from '@/lib/products';
import { getProductSlug } from '@/lib/products';

const CUSTOM_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'custom-products.json');

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
  return JSON.parse(data) as Product[];
}

export async function writeCustomProducts(products: Product[]): Promise<void> {
  await ensureCustomProductsFile();
  await fs.writeFile(CUSTOM_PRODUCTS_FILE, JSON.stringify(products, null, 2));
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

  const product: Product = {
    ...input,
    id,
    slug: input.slug || slugifyProductName(input.name),
    isNew: input.isNew ?? true,
  };

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
  >
> & { clearInventory?: boolean };

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

  products[index] = next;
  await writeCustomProducts(products);
  return next;
}

export async function getCustomProductById(id: string): Promise<Product | undefined> {
  const products = await readCustomProducts();
  return products.find((product) => product.id === id);
}

export function getCustomProductSlug(product: Product): string {
  return product.slug || getProductSlug(product);
}