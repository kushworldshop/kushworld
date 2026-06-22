import fs from 'fs/promises';
import path from 'path';
import {
  products as baseProducts,
  type Product,
  getProductSlug,
  getProductDescription,
} from '@/lib/products';
import { clampProductOptionGroups, getProductOptionGroups, type ProductOptionGroup } from '@/lib/productOptions';
import {
  isCustomProductId,
  readCustomProducts,
  updateCustomProduct,
  type CustomProductUpdate,
} from '@/lib/customProducts';
import { getProductMedia, type ProductMediaItem } from '@/lib/productMedia';

const OVERRIDES_FILE = path.join(process.cwd(), 'data', 'product-overrides.json');

export type ProductOverride = Partial<
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
>;

function toStorefrontProduct(product: Product): Product {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cost: _cost, inventory, ...storefrontProduct } = product;
  if (inventory !== undefined) {
    storefrontProduct.inStock = inventory > 0;
  }
  return storefrontProduct;
}

export function isProductHidden(product: Pick<Product, 'hidden'>): boolean {
  return product.hidden === true;
}

export function filterVisibleProducts<T extends Pick<Product, 'hidden'>>(products: T[]): T[] {
  return products.filter((product) => !isProductHidden(product));
}

export type ProductOverridesMap = Record<string, ProductOverride>;

async function ensureOverridesFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(OVERRIDES_FILE);
  } catch {
    await fs.writeFile(OVERRIDES_FILE, JSON.stringify({}, null, 2));
  }
}

export async function readProductOverrides(): Promise<ProductOverridesMap> {
  await ensureOverridesFile();
  const data = await fs.readFile(OVERRIDES_FILE, 'utf8');
  return JSON.parse(data) as ProductOverridesMap;
}

async function writeProductOverrides(overrides: ProductOverridesMap): Promise<void> {
  await ensureOverridesFile();
  await fs.writeFile(OVERRIDES_FILE, JSON.stringify(overrides, null, 2));
}

function mergeProduct(base: Product, override?: ProductOverride): Product {
  if (!override) return { ...base };
  const merged: Product = {
    ...base,
    ...override,
    price: override.price ?? base.price,
  };

  if (override.optionGroups !== undefined) {
    merged.optionGroups = override.optionGroups;
  }

  return merged;
}

async function getBaseProductsMerged(): Promise<Product[]> {
  const overrides = await readProductOverrides();
  return baseProducts.map((product) => mergeProduct(product, overrides[product.id]));
}

export async function getAllProducts(): Promise<Product[]> {
  const base = await getBaseProductsMerged();
  const custom = await readCustomProducts();
  return [...base, ...custom];
}

export async function getProducts(): Promise<Product[]> {
  return filterVisibleProducts(await getAllProducts()).map(toStorefrontProduct);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.id === id);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const product = (await getAllProducts()).find((item) => getProductSlug(item) === slug);
  if (!product || isProductHidden(product)) return undefined;
  return toStorefrontProduct(product);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.toLowerCase().trim();
  const products = await getProducts();
  if (!q) return products;
  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(q) ||
      product.category.toLowerCase().includes(q) ||
      getProductDescription(product).toLowerCase().includes(q)
  );
}

export async function updateProduct(
  id: string,
  updates: ProductOverride & { clearInventory?: boolean }
): Promise<Product | null> {
  if (isCustomProductId(id)) {
    return updateCustomProduct(id, updates as CustomProductUpdate);
  }
  return updateProductOverride(id, updates);
}

export async function updateProductOverride(
  id: string,
  updates: ProductOverride & { clearInventory?: boolean }
): Promise<Product | null> {
  const base = baseProducts.find((product) => product.id === id);
  if (!base) return null;

  const overrides = await readProductOverrides();
  const current = overrides[id] ?? {};
  const next: ProductOverride = { ...current };

  if (updates.name !== undefined) next.name = updates.name.trim() || base.name;
  if (updates.price !== undefined) next.price = Math.max(0, Number(updates.price));
  if (updates.cost !== undefined) {
    const cost = Math.max(0, Number(updates.cost));
    if (cost > 0) next.cost = cost;
    else delete next.cost;
  }
  if (updates.clearInventory) {
    delete next.inventory;
  } else if (updates.inventory !== undefined) {
    next.inventory = Math.max(0, Math.floor(Number(updates.inventory)));
  }
  if (updates.image !== undefined) next.image = updates.image.trim() || base.image;
  if (updates.images !== undefined) {
    if (updates.images.length > 0) next.images = updates.images;
    else delete next.images;
  }
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
    const cleanedGroups = sanitizeOptionGroups(updates.optionGroups);
    if (cleanedGroups.length > 0) next.optionGroups = cleanedGroups;
    else delete next.optionGroups;
  }
  if (updates.hidden !== undefined) {
    if (updates.hidden) next.hidden = true;
    else delete next.hidden;
  }
  if (updates.category !== undefined) {
    const category = updates.category.trim();
    if (category) next.category = category;
    else delete next.category;
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

  const cleaned = cleanOverrideForStorage(base, next);

  if (Object.keys(cleaned).length === 0) {
    delete overrides[id];
  } else {
    overrides[id] = cleaned;
  }

  await writeProductOverrides(overrides);
  return mergeProduct(base, overrides[id]);
}

function cleanOverrideForStorage(base: Product, next: ProductOverride): ProductOverride {
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => {
      if (value === undefined || value === '') return false;
      if (key === 'hidden') return value === true;
      if (key === 'featured' || key === 'bestSeller' || key === 'isNew') return value === true;
      if (key === 'compareAtPrice') return typeof value === 'number' && value > 0;
      if (key === 'cost') return typeof value === 'number' && value > 0;
      if (key === 'inventory') return typeof value === 'number' && value >= 0;
      if (key === 'optionGroups') {
        return JSON.stringify(value) !== JSON.stringify(getProductOptionGroups(base));
      }
      if (key === 'media') {
        return JSON.stringify(value) !== JSON.stringify(getProductMedia(base));
      }
      if (key === 'images') {
        return JSON.stringify(value) !== JSON.stringify(base.images ?? []);
      }
      const baseValue = base[key as keyof Product];
      return value !== baseValue;
    })
  ) as ProductOverride;
}

export async function setProductsHidden(ids: string[], hidden: boolean): Promise<number> {
  const uniqueIds = [...new Set(ids)];
  const overrides = await readProductOverrides();
  const customProducts = await readCustomProducts();
  let updated = 0;
  let customChanged = false;
  let overridesChanged = false;

  for (const id of uniqueIds) {
    if (isCustomProductId(id)) {
      const index = customProducts.findIndex((product) => product.id === id);
      if (index === -1) continue;
      if (isProductHidden(customProducts[index]) === hidden) continue;
      if (hidden) customProducts[index] = { ...customProducts[index], hidden: true };
      else {
        const next = { ...customProducts[index] };
        delete next.hidden;
        customProducts[index] = next;
      }
      customChanged = true;
      updated += 1;
      continue;
    }

    const base = baseProducts.find((product) => product.id === id);
    if (!base) continue;

    const merged = mergeProduct(base, overrides[id]);
    if (isProductHidden(merged) === hidden) continue;

    const next: ProductOverride = { ...(overrides[id] ?? {}) };
    if (hidden) next.hidden = true;
    else delete next.hidden;

    const cleaned = cleanOverrideForStorage(base, next);
    if (Object.keys(cleaned).length === 0) {
      delete overrides[id];
    } else {
      overrides[id] = cleaned;
    }
    overridesChanged = true;
    updated += 1;
  }

  if (customChanged) {
    const { writeCustomProducts } = await import('@/lib/customProducts');
    await writeCustomProducts(customProducts);
  }
  if (overridesChanged) {
    await writeProductOverrides(overrides);
  }

  return updated;
}

function sanitizeOptionGroups(groups: ProductOptionGroup[]): ProductOptionGroup[] {
  return clampProductOptionGroups(groups);
}

export async function setProductHidden(id: string, hidden: boolean): Promise<Product | null> {
  return updateProductOverride(id, { hidden });
}

export async function getAdminProducts(): Promise<
  Array<
    Product & {
      hasOverride: boolean;
      hidden: boolean;
      basePrice: number;
      baseName: string;
      baseImage: string;
      isCustom?: boolean;
    }
  >
> {
  const overrides = await readProductOverrides();
  const baseAdmin = baseProducts.map((base) => {
    const merged = mergeProduct(base, overrides[base.id]);
    return {
      ...merged,
      hidden: isProductHidden(merged),
      hasOverride: !!overrides[base.id],
      basePrice: base.price,
      baseName: base.name,
      baseImage: base.image,
      isCustom: false,
    };
  });

  const custom = await readCustomProducts();
  const customAdmin = custom.map((product) => ({
    ...product,
    hidden: isProductHidden(product),
    hasOverride: false,
    basePrice: product.price,
    baseName: product.name,
    baseImage: product.image,
    isCustom: true,
  }));

  return [...baseAdmin, ...customAdmin];
}