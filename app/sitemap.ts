import type { MetadataRoute } from 'next';
import { products, getProductSlug } from '@/lib/products';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://kushworld.shop';

  const productUrls = products.map((p) => ({
    url: `${base}/products/${getProductSlug(p)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${base}/coa`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/cart`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/wholesale`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/referral`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/reviews`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    ...productUrls,
  ];
}