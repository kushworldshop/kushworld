import LegalPage from '@/app/components/LegalPage';
import PolicyContent from '@/app/components/PolicyContent';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContent } from '@/lib/siteContent';

export async function generateMetadata() {
  const content = await getSiteContent();
  return buildPageMetadata({
    title: content.policies.terms.title,
    description: 'Terms of use for shopping at Kush World.',
    path: '/terms',
  });
}

export default async function Terms() {
  const content = await getSiteContent();

  return (
    <LegalPage title={content.policies.terms.title}>
      <PolicyContent body={content.policies.terms.body} />
    </LegalPage>
  );
}