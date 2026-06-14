import type { Metadata } from 'next';
import SiteLayout from '@/app/components/SiteLayout';
import SeoFaq from '@/app/components/SeoFaq';
import JsonLd from '@/app/components/JsonLd';
import { getSiteContent } from '@/lib/siteContent';
import { buildPageMetadata, faqJsonLd } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return buildPageMetadata({
    title: content.faq.title || 'FAQ',
    description: content.faq.subtitle || 'Frequently asked questions about Kush World products, shipping, and more.',
    path: '/faq',
  });
}

export default async function FaqPage() {
  const content = await getSiteContent();
  const { features } = content;

  const faqs = content.faq?.items || [];

  if (!features.faqSection.enabled) {
    return (
      <SiteLayout>
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">FAQ Unavailable</h1>
          <p className="text-zinc-400">Our FAQ section is turned off right now. Check back soon or contact us.</p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <JsonLd data={[faqJsonLd(faqs)]} />
      <SeoFaq />
    </SiteLayout>
  );
}
