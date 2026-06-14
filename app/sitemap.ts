import type { MetadataRoute } from 'next';
import { getProductSlug } from '@/lib/products';
import { getProducts } from '@/lib/productCatalog';
import { PUBLIC_PAGES, SITE_URL } from '@/lib/seo';
import { getSiteContent } from '@/lib/siteContent';
import { getEnabledShopCategories, MERCH_SHOP_ID } from '@/lib/shopNavigation';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const productUrls = products.map((p) => ({
    url: `${SITE_URL}/products/${getProductSlug(p)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: p.category === 'merch' ? 0.75 : 0.8,
  }));

  const content = await getSiteContent();
  const nav = content.shopNavigation;
  const enabledCats = getEnabledShopCategories(nav);

  const dynamicShopCategoryPaths = [
    '/shop',
    `/shop/${MERCH_SHOP_ID}`,
    ...enabledCats.map((c) => `/shop/${c.id}`),
  ];

  const staticPages = PUBLIC_PAGES
    .filter((page) => !page.path.startsWith('/shop'))
    .map((page) => ({
      url: `${SITE_URL}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    }));

  const shopPages = dynamicShopCategoryPaths.map((path, idx) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: idx === 0 ? ('daily' as const) : ('weekly' as const),
    priority: idx === 0 ? 0.95 : 0.88,
  }));

  return [...staticPages, ...shopPages, ...productUrls];
}