import HomeClient from './HomeClient';
import JsonLd from './components/JsonLd';
import {
  buildPageMetadata,
  faqJsonLd,
  HOME_FAQS,
  onlineStoreJsonLd,
  organizationJsonLd,
  SITE_TAGLINE,
  websiteJsonLd,
} from '@/lib/seo';

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
      'lab tested cannabis products',
      'free shipping hemp',
    ],
  }),
  title: {
    absolute: 'Kush World | Premium Hemp, Lab-Tested Products & Studio Merch',
  },
};

export default function Home() {
  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          onlineStoreJsonLd(),
          faqJsonLd(HOME_FAQS),
        ]}
      />
      <HomeClient />
    </>
  );
}