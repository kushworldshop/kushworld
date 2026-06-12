import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SiteLayout from '@/app/components/SiteLayout';
import ProductDetail from '@/app/components/ProductDetail';
import { getProductBySlug, getProductDescription } from '@/lib/products';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: 'Product Not Found' };

  return {
    title: `${product.name} | Kush World`,
    description: getProductDescription(product),
    openGraph: { images: [product.image] },
  };
}

export async function generateStaticParams() {
  const { products, getProductSlug } = await import('@/lib/products');
  return products.map((p) => ({ slug: getProductSlug(p) }));
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  return (
    <SiteLayout>
      <ProductDetail product={product} />
    </SiteLayout>
  );
}