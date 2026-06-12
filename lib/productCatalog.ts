import fs from 'fs/promises';
import path from 'path';
import {
  products as baseProducts,
  type Product,
  getProductSlug,
  getProductDescription,
} from '@/lib/products';
import { getProductOptionGroups, type ProductOptionGroup } from '@/lib/productOptions';

const OVERRIDES_FILE = path.join(process.cwd(), 'data', 'product-overrides.json');

export type ProductOverride = Partial<
  Pick<Product, 'name' | 'price' | 'image' | 'description' | 'optionGroups' | 'hidden'>
>;

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

export async function getAllProducts(): Promise<Product[]> {
  const overrides = await readProductOverrides();
  return baseProducts.map((product) => mergeProduct(product, overrides[product.id]));
}

export async function getProducts(): Promise<Product[]> {
  return filterVisibleProducts(await getAllProducts());
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.id === id);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const product = (await getAllProducts()).find((item) => getProductSlug(item) === slug);
  if (!product || isProductHidden(product)) return undefined;
  return product;
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

export async function updateProductOverride(
  id: string,
  updates: ProductOverride
): Promise<Product | null> {
  const base = baseProducts.find((product) => product.id === id);
  if (!base) return null;

  const overrides = await readProductOverrides();
  const current = overrides[id] ?? {};
  const next: ProductOverride = { ...current };

  if (updates.name !== undefined) next.name = updates.name.trim() || base.name;
  if (updates.price !== undefined) next.price = Math.max(0, Number(updates.price));
  if (updates.image !== undefined) next.image = updates.image.trim() || base.image;
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

  const cleaned = Object.fromEntries(
    Object.entries(next).filter(([key, value]) => {
      if (value === undefined || value === '') return false;
      if (key === 'hidden') return value === true;
      if (key === 'optionGroups') {
        return JSON.stringify(value) !== JSON.stringify(getProductOptionGroups(base));
      }
      const baseValue = base[key as keyof Product];
      return value !== baseValue;
    })
  ) as ProductOverride;

  if (Object.keys(cleaned).length === 0) {
    delete overrides[id];
  } else {
    overrides[id] = cleaned;
  }

  await writeProductOverrides(overrides);
  return mergeProduct(base, overrides[id]);
}

function sanitizeOptionGroups(groups: ProductOptionGroup[]): ProductOptionGroup[] {
  return groups
    .map((group) => ({
      name: group.name.trim(),
      values: group.values
        .map((value) => ({
          label: value.label.trim(),
          priceAdjustment:
            value.priceAdjustment !== undefined && !Number.isNaN(Number(value.priceAdjustment))
              ? Number(value.priceAdjustment)
              : undefined,
        }))
        .filter((value) => value.label),
    }))
    .filter((group) => group.name && group.values.length > 0);
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
    }
  >
> {
  const overrides = await readProductOverrides();
  return baseProducts.map((base) => {
    const merged = mergeProduct(base, overrides[base.id]);
    return {
      ...merged,
      hidden: isProductHidden(merged),
      hasOverride: !!overrides[base.id],
      basePrice: base.price,
      baseName: base.name,
      baseImage: base.image,
    };
  });
}