import LegalPage from '@/app/components/LegalPage';
import PolicyContent from '@/app/components/PolicyContent';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContent } from '@/lib/siteContent';

export async function generateMetadata() {
  const content = await getSiteContent();
  return buildPageMetadata({
    title: content.policies.shipping.title,
    description: 'Shipping rates, processing times, and delivery information for Kush World orders.',
    path: '/shipping-policy',
  });
}

export default async function ShippingPolicy() {
  const content = await getSiteContent();

  return (
    <LegalPage title={content.policies.shipping.title}>
      <PolicyContent body={content.policies.shipping.body} />
    </LegalPage>
  );
}