import type { Product } from '@/lib/products';

export type ProductMediaType = 'image' | 'video';

export interface ProductMediaItem {
  type: ProductMediaType;
  url: string;
}

const VIDEO_URL_PATTERN = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;
const IMAGE_URL_PATTERN = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;

export function isVideoMediaUrl(url: string): boolean {
  return VIDEO_URL_PATTERN.test(url);
}

export function isImageMediaUrl(url: string): boolean {
  return IMAGE_URL_PATTERN.test(url);
}

export function isProductMediaVideo(
  item: Pick<ProductMediaItem, 'type' | 'url'> | string | null | undefined
): boolean {
  if (!item) return false;
  if (typeof item === 'string') return isVideoMediaUrl(item);
  return item.type === 'video' || isVideoMediaUrl(item.url);
}

export function inferMediaType(url: string): ProductMediaType {
  return isVideoMediaUrl(url) ? 'video' : 'image';
}

export function inferMediaTypeFromMime(mimeType: string): ProductMediaType {
  return mimeType.startsWith('video/') ? 'video' : 'image';
}

export function getProductMedia(product: Pick<Product, 'image' | 'images' | 'media'>): ProductMediaItem[] {
  if (product.media?.length) {
    return normalizeProductMedia(product.media);
  }
  const legacy: ProductMediaItem[] = [];
  if (product.images?.length) {
    for (const url of product.images) {
      legacy.push({ type: inferMediaType(url), url });
    }
  }
  if (product.image) {
    legacy.push({ type: inferMediaType(product.image), url: product.image });
  }
  return normalizeProductMedia(legacy);
}

export function getProductCoverUrl(product: Pick<Product, 'image' | 'images' | 'media'>): string {
  const media = getProductMedia(product);
  if (media.length > 0) return media[0].url;
  return product.image ?? '';
}

export function getProductOgImageUrl(product: Pick<Product, 'image' | 'images' | 'media'>): string {
  const media = getProductMedia(product);
  const firstImage = media.find((item) => item.type === 'image');
  if (firstImage) return firstImage.url;
  if (product.image && !isVideoMediaUrl(product.image)) return product.image;
  return '';
}

export function normalizeProductMedia(media: ProductMediaItem[]): ProductMediaItem[] {
  const seen = new Set<string>();
  const next: ProductMediaItem[] = [];
  for (const item of media) {
    const url = item.url?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const type: ProductMediaType =
      isVideoMediaUrl(url) || (item.type === 'video' && !isImageMediaUrl(url)) ? 'video' : 'image';
    next.push({ type, url });
  }
  return next;
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

export function reorderProductMedia(
  media: ProductMediaItem[],
  fromIndex: number,
  toIndex: number
): ProductMediaItem[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= media.length ||
    toIndex >= media.length
  ) {
    return media;
  }
  const next = [...media];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}