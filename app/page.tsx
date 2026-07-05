import HomeClient from './HomeClient';
import JsonLd from './components/JsonLd';
import {
  buildPageMetadata,
  onlineStoreJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import { getFeaturedAndRecent, getReviewStats } from '@/lib/reviews';

export const metadata = {
  ...buildPageMetadata({
    title: 'Premium Hemp, Lab-Tested Products & Studio Merch',
    description:
      'Shop Kush World — lab-tested hemp vapes, concentrates, flower, and official Kush World Studio merch. COAs on every product. Discreet nationwide shipping. 21+ only.',
    path: '/',
    keywords: [
      'buy hemp online',
      'Kush World shop',
      'hemp head shop',
      'lab tested hemp products',
      'free shipping hemp',
    ],
  }),
  title: {
    absolute: 'Kush World | Premium Hemp, Lab-Tested Products & Studio Merch',
  },
};

export default async function Home() {
  const allReviews = await getFeaturedAndRecent(50);
  const featuredReviews = allReviews.filter((r) => r.featured || r.source === 'x').slice(0, 3);
  const stats = getReviewStats(allReviews);

  const initialReviews = featuredReviews.map((review) => ({
    id: review.id,
    productId: review.productId,
    author: review.author,
    rating: review.rating,
    comment: review.comment,
    source: review.source,
    xHandle: review.xHandle,
    xUrl: review.xUrl,
    productName: null as string | null,
    productSlug: null as string | null,
    createdAt: review.createdAt,
  }));

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          onlineStoreJsonLd(),
        ]}
      />
      <HomeClient
        initialReviews={initialReviews}
        initialReviewStats={{ count: stats.count, average: stats.average }}
      />
    </>
  );
}