import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ShopPageClient from '../ShopPageClient';
import JsonLd from '@/app/components/JsonLd';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import { getSiteContent } from '@/lib/siteContent';
import {
  getEnabledShopCategories,
  getShopCategoryById,
  isMerchShopCategory,
  MERCH_SHOP_ID,
  normalizeShopCategoryId,
} from '@/lib/shopNavigation';

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  const content = await getSiteContent();
  const categories = getEnabledShopCategories(content.shopNavigation).map((category) => ({
    category: category.id,
  }));
  return [...categories, { category: MERCH_SHOP_ID }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const normalized = normalizeShopCategoryId(category);
  const content = await getSiteContent();
  const nav = content.shopNavigation;

  if (isMerchShopCategory(normalized)) {
    return buildPageMetadata({
      title: nav.merchTitle,
      description: nav.merchSubtitle,
      path: `/shop/${MERCH_SHOP_ID}`,
      keywords: ['Kush World merch', 'studio apparel', 'hemp clothing'],
    });
  }

  const shopCategory = getShopCategoryById(nav, normalized);
  if (!shopCategory) return { title: 'Category Not Found' };

  return buildPageMetadata({
    title: `${shopCategory.label} | Kush World`,
    description: shopCategory.description,
    path: `/shop/${shopCategory.id}`,
    keywords: [shopCategory.label, 'Kush World', 'lab tested', 'hemp'],
  });
}

export default async function CategoryShopPage({ params }: Props) {
  const { category } = await params;
  const normalized = normalizeShopCategoryId(category);
  const content = await getSiteContent();
  const nav = content.shopNavigation;

  if (!isMerchShopCategory(normalized) && !getShopCategoryById(nav, normalized)) {
    notFound();
  }

  const label = isMerchShopCategory(normalized)
    ? 'Studio Merch'
    : getShopCategoryById(nav, normalized)!.label;

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          { name: label, path: `/shop/${normalized}` },
        ])}
      />
      <ShopPageClient
        initialCategory={normalized}
        merchOnly={isMerchShopCategory(normalized)}
      />
    </>
  );
}