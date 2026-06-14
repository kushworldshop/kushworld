import HomeClient from './HomeClient';
import JsonLd from './components/JsonLd';
import { getSiteContent } from '@/lib/siteContent';
import {
  buildPageMetadata,
  faqJsonLd,
  HOME_FAQS,
  onlineStoreJsonLd,
  organizationJsonLd,
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

export default async function Home() {
  const content = await getSiteContent();
  const dynamicFaqs = content.faq?.items?.length
    ? content.faq.items.map((item: { question: string; answer: string }) => ({
        question: item.question,
        answer: item.answer,
      }))
    : HOME_FAQS;

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          onlineStoreJsonLd(),
          faqJsonLd(dynamicFaqs),
        ]}
      />
      <HomeClient />
    </>
  );
}