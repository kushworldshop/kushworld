import fs from 'fs/promises';
import path from 'path';
import { xaiVisionMimeType } from '@/lib/xai';

export interface ProductImageBytes {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png';
  sourceUrl: string;
}

function normalizeImagePath(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith('/products/')) {
      return parsed.pathname;
    }
    return trimmed;
  } catch {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
}

async function readLocalPublicImage(imagePath: string): Promise<ProductImageBytes | null> {
  const normalized = normalizeImagePath(imagePath);
  if (!normalized.startsWith('/')) return null;

  const ext = path.extname(normalized).toLowerCase();
  const mimeType = xaiVisionMimeType(
    ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext
  );
  if (!mimeType) return null;

  const filePath = path.join(process.cwd(), 'public', normalized.replace(/^\//, ''));
  try {
    const buffer = await fs.readFile(filePath);
    return { buffer, mimeType, sourceUrl: normalized };
  } catch {
    return null;
  }
}

async function fetchRemoteImage(url: string): Promise<ProductImageBytes | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const mimeType = xaiVisionMimeType(contentType.split(';')[0].trim());
    if (!mimeType) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, mimeType, sourceUrl: url };
  } catch {
    return null;
  }
}

export async function loadProductImageBytes(imageUrl: string): Promise<ProductImageBytes | null> {
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) {
    return readLocalPublicImage(trimmed);
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const localFromUrl = await readLocalPublicImage(trimmed);
    if (localFromUrl) return localFromUrl;
    return fetchRemoteImage(trimmed);
  }

  return readLocalPublicImage(`/${trimmed}`);
}

export async function loadProductImageSet(imageUrls: string[], maxImages = 6): Promise<ProductImageBytes[]> {
  const unique = [...new Set(imageUrls.map((url) => url.trim()).filter(Boolean))].slice(0, maxImages);
  const loaded: ProductImageBytes[] = [];

  for (const url of unique) {
    const file = await loadProductImageBytes(url);
    if (file) loaded.push(file);
  }

  return loaded;
}