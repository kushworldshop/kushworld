import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SiteLayout from '@/app/components/SiteLayout';
import ProductDetail from '@/app/components/ProductDetail';
import JsonLd from '@/app/components/JsonLd';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildPageMetadata,
  getSeoDescription,
  productJsonLd,
} from '@/lib/seo';
import { getProductSlug, type Product } from '@/lib/products';
import { getProductBySlug, getProducts } from '@/lib/productCatalog';
import { getSiteContent } from '@/lib/siteContent';
import { getShopCategoryLabel, getShopPathForProduct } from '@/lib/shopNavigation';
import { getReviewsForProduct, getReviewStats } from '@/lib/reviews';

interface Props {
  params: Promise<{ slug: string }>;
}

function getCategoryLabel(product: Product, nav: Awaited<ReturnType<typeof getSiteContent>>['shopNavigation']) {
  if (product.category === 'merch') return 'Studio Merch';
  const shopCategory = nav.categories.find((category) =>
    category.productCategories.includes(product.category)
  );
  return shopCategory ? getShopCategoryLabel(nav, shopCategory.id) : product.category;
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
  const content = await getSiteContent();
  const categoryPath = getShopPathForProduct(content.shopNavigation, product);

  // Server-fetch reviews for rich schema (aggregateRating + sample reviews)
  const productReviews = await getReviewsForProduct(product.id);
  const reviewStats = getReviewStats(productReviews);
  const reviewData =
    reviewStats.count > 0
      ? { average: reviewStats.average, count: reviewStats.count, reviews: productReviews }
      : undefined;

  return (
    <SiteLayout>
      <JsonLd
        data={[
          productJsonLd(product, reviewData),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Shop', path: '/shop' },
            { name: getCategoryLabel(product, content.shopNavigation), path: categoryPath },
            { name: product.name, path: productPath },
          ]),
        ]}
      />
      <ProductDetail product={product} />
    </SiteLayout>
  );
}