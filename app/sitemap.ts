import type { MetadataRoute } from 'next';
import { getProductSlug } from '@/lib/products';
import { getProducts } from '@/lib/productCatalog';
import { PUBLIC_PAGES, SITE_URL } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const productUrls = products.map((p) => ({
    url: `${SITE_URL}/products/${getProductSlug(p)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: p.category === 'merch' ? 0.75 : 0.8,
  }));

  const staticPages = PUBLIC_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  return [...staticPages, ...productUrls];
}