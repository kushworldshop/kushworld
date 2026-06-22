import fs from 'fs/promises';
import path from 'path';
import type { Product } from '@/lib/products';
import {
  buildCustomProductId,
  createCustomProduct,
  parseFlowerImageFilename,
  readCustomProducts,
  slugifyProductName,
} from '@/lib/customProducts';
import {
  ALLOWED_PRODUCT_IMAGE_TYPES,
  MAX_PRODUCT_IMAGE_BYTES,
  buildProductImageFilename,
  ensureProductImageDir,
  getPublicProductImagePath,
  PRODUCT_IMAGE_DIR,
} from '@/lib/productImages';

export type StrainImageGroup = {
  strain: string;
  hand?: File;
  bag?: File;
  other: File[];
};

export function groupFilesByStrain(files: File[]): StrainImageGroup[] {
  const groups = new Map<string, StrainImageGroup>();

  for (const file of files) {
    const parsed = parseFlowerImageFilename(file.name);
    const strain = parsed?.strain || file.name.replace(/\.[^.]+$/i, '').trim();
    if (!strain) continue;

    const key = strain.toLowerCase();
    const group = groups.get(key) ?? { strain, other: [] };
    if (parsed?.kind === 'hand') group.hand = file;
    else if (parsed?.kind === 'bag') group.bag = file;
    else group.other.push(file);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => a.strain.localeCompare(b.strain));
}

async function saveProductImage(productId: string, file: File): Promise<string> {
  if (!ALLOWED_PRODUCT_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_PRODUCT_IMAGE_TYPES)[number])) {
    throw new Error(`Unsupported image type for ${file.name}`);
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error(`Image too large: ${file.name}`);
  }

  await ensureProductImageDir();
  const filename = buildProductImageFilename(productId, file.type);
  const storagePath = path.join(PRODUCT_IMAGE_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storagePath, buffer);
  return getPublicProductImagePath(filename);
}

export type ImportProductResult = {
  strain: string;
  status: 'created' | 'skipped' | 'error';
  product?: Product;
  message?: string;
};

export async function importStrainGroups(
  groups: StrainImageGroup[],
  options: { category: string; defaultPrice: number }
): Promise<ImportProductResult[]> {
  const existing = await readCustomProducts();
  const results: ImportProductResult[] = [];

  for (const group of groups) {
    const productId = buildCustomProductId(group.strain);
    if (existing.some((product) => product.id === productId)) {
      results.push({
        strain: group.strain,
        status: 'skipped',
        message: 'Product already exists',
      });
      continue;
    }

    try {
      const primaryFile = group.hand ?? group.bag ?? group.other[0];
      if (!primaryFile) {
        results.push({
          strain: group.strain,
          status: 'error',
          message: 'No image file found',
        });
        continue;
      }

      const imagePaths: string[] = [];
      const orderedFiles: File[] = [];
      if (group.hand) orderedFiles.push(group.hand);
      if (group.bag) orderedFiles.push(group.bag);
      for (const file of group.other) {
        if (!orderedFiles.includes(file)) orderedFiles.push(file);
      }
      if (orderedFiles.length === 0) orderedFiles.push(primaryFile);

      for (const file of orderedFiles) {
        imagePaths.push(await saveProductImage(productId, file));
      }

      const product = await createCustomProduct({
        id: productId,
        name: group.strain,
        slug: slugifyProductName(group.strain),
        price: options.defaultPrice,
        image: imagePaths[0],
        images: imagePaths.length > 1 ? imagePaths : undefined,
        category: options.category,
        sizes: [],
        isNew: true,
      });

      existing.push(product);
      results.push({ strain: group.strain, status: 'created', product });
    } catch (error) {
      results.push({
        strain: group.strain,
        status: 'error',
        message: error instanceof Error ? error.message : 'Import failed',
      });
    }
  }

  return results;
}

export async function importProductFiles(
  files: File[],
  options: { category: string; defaultPrice: number }
): Promise<{ groups: number; results: ImportProductResult[] }> {
  const groups = groupFilesByStrain(files);
  const results = await importStrainGroups(groups, options);
  return { groups: groups.length, results };
}