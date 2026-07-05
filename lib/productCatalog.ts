import fs from 'fs/promises';
import path from 'path';
import {
  products as baseProducts,
  type Product,
  getProductSlug,
  getProductDescription,
} from '@/lib/products';
import { clampProductOptionGroups, getProductOptionGroups, type ProductOptionGroup } from '@/lib/productOptions';
import { sanitizeTierPricing } from '@/lib/tierPricing';
import {
  createCustomProduct,
  deleteCustomProducts,
  isCustomProductId,
  readCustomProducts,
  updateCustomProduct,
  type CustomProductUpdate,
} from '@/lib/customProducts';
import { getProductMedia, syncProductMediaFields, type ProductMediaItem } from '@/lib/productMedia';
import {
  DEFAULT_SHOP_NAVIGATION,
  normalizeProductCategorySlug,
  type ShopNavigation,
} from '@/lib/shopNavigation';

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
    | 'thcaPercent'
    | 'strainType'
    | 'tier'
    | 'effect'
    | 'effects'
    | 'limitedEdition'
    | 'isDrop'
    | 'tierPricing'
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

let overridesWriteLock: Promise<void> = Promise.resolve();

async function withOverridesLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = overridesWriteLock.then(fn, fn);
  overridesWriteLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function ensureOverridesFile() {
  const dataDir = path.join(process.cwd(), 'data');
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(OVERRIDES_FILE);
  } catch {
    await fs.writeFile(OVERRIDES_FILE, JSON.stringify({}, null, 2));
  }
}

async function readOverridesFileUnsafe(): Promise<ProductOverridesMap> {
  await ensureOverridesFile();
  const data = await fs.readFile(OVERRIDES_FILE, 'utf8');
  return JSON.parse(data) as ProductOverridesMap;
}

async function writeOverridesFileUnsafe(overrides: ProductOverridesMap): Promise<void> {
  await ensureOverridesFile();
  await fs.writeFile(OVERRIDES_FILE, JSON.stringify(overrides, null, 2));
}

function repairProductOverride(
  base: Product,
  override: ProductOverride,
  nav: ShopNavigation = DEFAULT_SHOP_NAVIGATION
): ProductOverride {
  const repaired: ProductOverride = { ...override };

  if (repaired.category !== undefined) {
    const normalized = normalizeProductCategorySlug(repaired.category, nav);
    if (normalized) repaired.category = normalized;
    else delete repaired.category;
  }

  const mergedForMedia: Product = { ...base, ...repaired, price: repaired.price ?? base.price };
  const syncedMedia = syncProductMediaFields(getProductMedia(mergedForMedia));
  if (syncedMedia.media.length > 0) {
    repaired.media = syncedMedia.media;
    repaired.image = syncedMedia.image;
    if (syncedMedia.images?.length) repaired.images = syncedMedia.images;
    else delete repaired.images;
  }

  return repaired;
}

function applyMergedProductRepairs(base: Product, merged: Product, nav: ShopNavigation): Product {
  const category = normalizeProductCategorySlug(merged.category, nav) || base.category;
  const syncedMedia = syncProductMediaFields(getProductMedia(merged));
  return {
    ...merged,
    category,
    media: syncedMedia.media.length > 0 ? syncedMedia.media : merged.media,
    image: syncedMedia.image || merged.image,
    images: syncedMedia.images ?? merged.images,
  };
}

export async function readProductOverrides(): Promise<ProductOverridesMap> {
  return withOverridesLock(async () => {
    const raw = await readOverridesFileUnsafe();
    let changed = false;
    const repaired: ProductOverridesMap = {};

    for (const [id, override] of Object.entries(raw)) {
      const base = baseProducts.find((product) => product.id === id);
      if (!base || !override) {
        repaired[id] = override;
        continue;
      }
      const next = repairProductOverride(base, override);
      const cleaned = cleanOverrideForStorage(base, next);
      if (Object.keys(cleaned).length > 0) {
        repaired[id] = cleaned;
      }
      if (JSON.stringify(cleaned) !== JSON.stringify(override)) {
        changed = true;
      }
    }

    if (changed) {
      await writeOverridesFileUnsafe(repaired);
    }

    return repaired;
  });
}

function mergeProduct(
  base: Product,
  override?: ProductOverride,
  nav: ShopNavigation = DEFAULT_SHOP_NAVIGATION
): Product {
  if (!override) return { ...base };
  const merged: Product = {
    ...base,
    ...override,
    price: override.price ?? base.price,
  };

  if (override.optionGroups !== undefined) {
    merged.optionGroups = override.optionGroups;
  }

  return applyMergedProductRepairs(base, merged, nav);
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
  updates: ProductOverride & { clearInventory?: boolean; clearTierPricing?: boolean }
): Promise<Product | null> {
  if (isCustomProductId(id)) {
    return updateCustomProduct(id, updates as CustomProductUpdate);
  }
  return updateProductOverride(id, updates);
}

const PLACEHOLDER_PRODUCT_IMAGE = '/logo.png';

export type CreateProductInput = {
  name: string;
  price: number;
  category: string;
  cost?: number;
  description?: string;
  subcategory?: string;
  merchSubcategory?: string;
  compareAtPrice?: number;
  featured?: boolean;
  bestSeller?: boolean;
  isNew?: boolean;
  optionGroups?: ProductOptionGroup[];
  inventory?: number;
  hidden?: boolean;
  thcaPercent?: number;
  strainType?: string;
  tier?: string;
  effects?: string[];
};

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Product name is required');
  }

  const category = normalizeProductCategorySlug(input.category);
  if (!category) {
    throw new Error('Category is required');
  }

  const price = Math.max(0, Number(input.price));
  if (!Number.isFinite(price)) {
    throw new Error('Valid price is required');
  }

  const syncedMedia = syncProductMediaFields([
    { type: 'image', url: PLACEHOLDER_PRODUCT_IMAGE },
  ]);

  return createCustomProduct({
    name,
    price,
    category,
    image: syncedMedia.image || PLACEHOLDER_PRODUCT_IMAGE,
    images: syncedMedia.images,
    media: syncedMedia.media,
    sizes: [],
    description: input.description?.trim() || undefined,
    cost: input.cost !== undefined && input.cost > 0 ? Math.max(0, Number(input.cost)) : undefined,
    subcategory: input.subcategory?.trim() || undefined,
    merchSubcategory: input.merchSubcategory?.trim() || undefined,
    compareAtPrice:
      input.compareAtPrice !== undefined && input.compareAtPrice > 0
        ? Math.max(0, Number(input.compareAtPrice))
        : undefined,
    featured: input.featured || undefined,
    bestSeller: input.bestSeller || undefined,
    isNew: input.isNew ?? true,
    optionGroups:
      input.optionGroups && input.optionGroups.length > 0
        ? sanitizeOptionGroups(input.optionGroups)
        : undefined,
    inventory:
      input.inventory !== undefined ? Math.max(0, Math.floor(Number(input.inventory))) : undefined,
    hidden: input.hidden || undefined,
    thcaPercent: input.thcaPercent,
    strainType: input.strainType?.trim() || undefined,
    tier: input.tier?.trim() || undefined,
    effects: input.effects?.filter(Boolean),
  });
}

export function toAdminProductRecord(
  product: Product,
  options?: { hasOverride?: boolean; base?: Product; isCustom?: boolean }
) {
  const base = options?.base ?? product;
  const syncedMedia = syncProductMediaFields(getProductMedia(product));
  return {
    ...product,
    media: syncedMedia.media,
    image: syncedMedia.image || product.image,
    images: syncedMedia.images ?? product.images,
    hidden: isProductHidden(product),
    hasOverride: options?.hasOverride ?? false,
    basePrice: base.price,
    baseName: base.name,
    baseImage: base.image,
    isCustom: options?.isCustom ?? isCustomProductId(product.id),
  };
}

async function mutateProductOverrides(
  mutator: (overrides: ProductOverridesMap) => void
): Promise<ProductOverridesMap> {
  return withOverridesLock(async () => {
    const overrides = await readOverridesFileUnsafe();
    mutator(overrides);
    await writeOverridesFileUnsafe(overrides);
    return overrides;
  });
}

function applyProductOverrideUpdates(
  base: Product,
  current: ProductOverride,
  updates: ProductOverride & { clearInventory?: boolean; clearTierPricing?: boolean }
): ProductOverride {
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
    if (updates.media.length > 0) {
      next.media = updates.media;
    } else {
      delete next.media;
      delete next.images;
    }
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
    const category = normalizeProductCategorySlug(updates.category);
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
  if (updates.clearTierPricing) {
    delete next.tierPricing;
  } else if (updates.tierPricing !== undefined) {
    const cleanedTiers = sanitizeTierPricing(updates.tierPricing);
    if (cleanedTiers.length > 0) next.tierPricing = cleanedTiers;
    else delete next.tierPricing;
  }

  return repairProductOverride(base, next);
}

export async function updateProductOverride(
  id: string,
  updates: ProductOverride & { clearInventory?: boolean; clearTierPricing?: boolean }
): Promise<Product | null> {
  const base = baseProducts.find((product) => product.id === id);
  if (!base) return null;

  let storedOverride: ProductOverride | undefined;

  await mutateProductOverrides((overrides) => {
    const current = overrides[id] ?? {};
    const repaired = applyProductOverrideUpdates(base, current, updates);
    const cleaned = cleanOverrideForStorage(base, repaired);

    if (Object.keys(cleaned).length === 0) {
      delete overrides[id];
      storedOverride = undefined;
    } else {
      overrides[id] = cleaned;
      storedOverride = cleaned;
    }
  });

  return mergeProduct(base, storedOverride);
}

function cleanOverrideForStorage(base: Product, next: ProductOverride): ProductOverride {
  const normalizedBaseCategory = normalizeProductCategorySlug(base.category);
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => {
      if (value === undefined || value === '') return false;
      if (key === 'hidden') return value === true;
      if (key === 'featured' || key === 'bestSeller' || key === 'isNew') return value === true;
      if (key === 'compareAtPrice') return typeof value === 'number' && value > 0;
      if (key === 'cost') return typeof value === 'number' && value > 0;
      if (key === 'inventory') return typeof value === 'number' && value >= 0;
      if (key === 'category') {
        const normalized = normalizeProductCategorySlug(String(value));
        return normalized !== normalizedBaseCategory;
      }
      if (key === 'optionGroups') {
        return JSON.stringify(value) !== JSON.stringify(getProductOptionGroups(base));
      }
      if (key === 'tierPricing') {
        return Array.isArray(value) && value.length > 0;
      }
      if (key === 'media') {
        return JSON.stringify(value) !== JSON.stringify(getProductMedia(base));
      }
      if (key === 'images') {
        const baseImages = getProductMedia(base)
          .filter((item) => item.type === 'image')
          .map((item) => item.url);
        return JSON.stringify(value) !== JSON.stringify(baseImages);
      }
      if (key === 'image') {
        const baseCover =
          getProductMedia(base).find((item) => item.type === 'image')?.url ?? base.image ?? '';
        return value !== baseCover;
      }
      const baseValue = base[key as keyof Product];
      return value !== baseValue;
    })
  ) as ProductOverride;
}

export async function setProductsHidden(ids: string[], hidden: boolean): Promise<number> {
  const uniqueIds = [...new Set(ids)];
  const customProducts = await readCustomProducts();
  let updated = 0;
  let customChanged = false;

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
    }
  }

  if (customChanged) {
    const { writeCustomProducts } = await import('@/lib/customProducts');
    await writeCustomProducts(customProducts);
  }

  const catalogIds = uniqueIds.filter((id) => !isCustomProductId(id));
  if (catalogIds.length > 0) {
    await mutateProductOverrides((overrides) => {
      for (const id of catalogIds) {
        const base = baseProducts.find((product) => product.id === id);
        if (!base) continue;

        const merged = mergeProduct(base, overrides[id]);
        if (isProductHidden(merged) === hidden) continue;

        const next = repairProductOverride(base, { ...(overrides[id] ?? {}) });
        if (hidden) next.hidden = true;
        else delete next.hidden;

        const cleaned = cleanOverrideForStorage(base, next);
        if (Object.keys(cleaned).length === 0) {
          delete overrides[id];
        } else {
          overrides[id] = cleaned;
        }
        updated += 1;
      }
    });
  }

  return updated;
}

function sanitizeOptionGroups(groups: ProductOptionGroup[]): ProductOptionGroup[] {
  return clampProductOptionGroups(groups);
}

export async function setProductHidden(id: string, hidden: boolean): Promise<Product | null> {
  return updateProductOverride(id, { hidden });
}

export async function deleteProducts(
  ids: string[]
): Promise<{ deleted: number; skippedCatalogIds: string[] }> {
  const uniqueIds = [...new Set(ids.filter((id) => typeof id === 'string' && id.length > 0))];
  const customIds = uniqueIds.filter(isCustomProductId);
  const skippedCatalogIds = uniqueIds.filter((id) => !isCustomProductId(id));
  const deleted = customIds.length > 0 ? await deleteCustomProducts(customIds) : 0;
  return { deleted, skippedCatalogIds };
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
    const syncedMedia = syncProductMediaFields(getProductMedia(merged));
    return {
      ...merged,
      media: syncedMedia.media,
      image: syncedMedia.image || merged.image,
      images: syncedMedia.images ?? merged.images,
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