import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ShopPageClient from '../ShopPageClient';
import JsonLd from '@/app/components/JsonLd';
import { breadcrumbJsonLd, buildPageMetadata, CATEGORY_SEO } from '@/lib/seo';

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return Object.keys(CATEGORY_SEO).map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const seo = CATEGORY_SEO[category];
  if (!seo) return { title: 'Category Not Found' };

  return buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: `/shop/${category}`,
    keywords: seo.keywords,
  });
}

export default async function CategoryShopPage({ params }: Props) {
  const { category } = await params;
  const seo = CATEGORY_SEO[category];
  if (!seo) notFound();

  const label = seo.title.split('—')[0].trim();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          { name: label, path: `/shop/${category}` },
        ])}
      />
      <ShopPageClient initialCategory={category} />
    </>
  );
}