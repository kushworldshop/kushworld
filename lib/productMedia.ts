import type { Product } from '@/lib/products';

export type ProductMediaType = 'image' | 'video';

export interface ProductMediaItem {
  type: ProductMediaType;
  url: string;
}

const VIDEO_URL_PATTERN = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export function isVideoMediaUrl(url: string): boolean {
  return VIDEO_URL_PATTERN.test(url);
}

export function inferMediaType(url: string): ProductMediaType {
  return isVideoMediaUrl(url) ? 'video' : 'image';
}

export function inferMediaTypeFromMime(mimeType: string): ProductMediaType {
  return mimeType.startsWith('video/') ? 'video' : 'image';
}

export function getProductMedia(product: Pick<Product, 'image' | 'images' | 'media'>): ProductMediaItem[] {
  if (product.media?.length) return product.media;
  if (product.images?.length) {
    return product.images.map((url) => ({ type: inferMediaType(url), url }));
  }
  if (product.image) {
    return [{ type: inferMediaType(product.image), url: product.image }];
  }
  return [];
}

export function getProductCoverUrl(product: Pick<Product, 'image' | 'images' | 'media'>): string {
  const media = getProductMedia(product);
  const firstImage = media.find((item) => item.type === 'image');
  return firstImage?.url ?? media[0]?.url ?? product.image;
}

export function normalizeProductMedia(media: ProductMediaItem[]): ProductMediaItem[] {
  const seen = new Set<string>();
  return media.filter((item) => {
    const url = item.url?.trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export function syncProductMediaFields(media: ProductMediaItem[]): {
  media: ProductMediaItem[];
  image: string;
  images?: string[];
} {
  const normalized = normalizeProductMedia(media);
  const imageUrls = normalized.filter((item) => item.type === 'image').map((item) => item.url);
  const cover = getProductCoverUrl({ image: '', media: normalized });

  return {
    media: normalized,
    image: cover,
    images: imageUrls.length > 0 ? imageUrls : undefined,
  };
}

export function appendProductMedia(
  product: Pick<Product, 'image' | 'images' | 'media'>,
  item: ProductMediaItem
): ReturnType<typeof syncProductMediaFields> {
  const current = getProductMedia(product);
  if (current.some((entry) => entry.url === item.url)) {
    return syncProductMediaFields(current);
  }
  return syncProductMediaFields([...current, item]);
}

export function setProductCoverMedia(
  product: Pick<Product, 'image' | 'images' | 'media'>,
  url: string
): ReturnType<typeof syncProductMediaFields> {
  const current = getProductMedia(product);
  const index = current.findIndex((item) => item.url === url);
  if (index === -1) return syncProductMediaFields(current);
  const next = [current[index], ...current.filter((_, i) => i !== index)];
  return syncProductMediaFields(next);
}

export function removeProductMedia(
  product: Pick<Product, 'image' | 'images' | 'media'>,
  url: string
): ReturnType<typeof syncProductMediaFields> {
  return syncProductMediaFields(getProductMedia(product).filter((item) => item.url !== url));
}