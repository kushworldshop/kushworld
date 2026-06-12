import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SiteLayout from '@/app/components/SiteLayout';
import ProductDetail from '@/app/components/ProductDetail';
import JsonLd from '@/app/components/JsonLd';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  CATEGORY_SEO,
  getSeoDescription,
  productJsonLd,
} from '@/lib/seo';
import { getProductSlug, type Product } from '@/lib/products';
import { getProductBySlug, getProducts } from '@/lib/productCatalog';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

function getCategoryPath(product: Product): string {
  return product.category === 'merch' ? '/shop/merch' : `/shop/${product.category}`;
}

function getCategoryLabel(product: Product): string {
  return CATEGORY_SEO[product.category]?.title.split('—')[0].trim() || product.category;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Product Not Found' };

  const image = product.image.startsWith('http') ? product.image : absoluteUrl(product.image);

  return buildPageMetadata({
    title: `${product.name} — $${product.price}`,
    description: getSeoDescription(product),
    path: `/products/${getProductSlug(product)}`,
    keywords: [
      product.name,
      product.category,
      product.merchSubcategory || '',
      'lab tested',
      'Kush World',
    ].filter(Boolean),
    image,
  });
}

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: getProductSlug(p) }));
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const productPath = `/products/${getProductSlug(product)}`;

  return (
    <SiteLayout>
      <JsonLd
        data={[
          productJsonLd(product),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Shop', path: '/shop' },
            { name: getCategoryLabel(product), path: getCategoryPath(product) },
            { name: product.name, path: productPath },
          ]),
        ]}
      />
      <ProductDetail product={product} />
    </SiteLayout>
  );
}