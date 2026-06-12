import fs from 'fs/promises';
import path from 'path';

export const PRODUCT_IMAGE_DIR = path.join(process.cwd(), 'public', 'products', 'uploads');
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_PRODUCT_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export async function ensureProductImageDir(): Promise<void> {
  await fs.mkdir(PRODUCT_IMAGE_DIR, { recursive: true });
}

export function getProductImageExtension(mimeType: string): string {
  return EXT_BY_TYPE[mimeType] || '.jpg';
}

export function buildProductImageFilename(productId: string, mimeType: string): string {
  const safeId = productId.replace(/[^a-zA-Z0-9_-]/g, '');
  const ext = getProductImageExtension(mimeType);
  return `product-${safeId}-${Date.now()}${ext}`;
}

export function getPublicProductImagePath(filename: string): string {
  return `/products/uploads/${filename}`;
}