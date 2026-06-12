import LegalPage from '@/app/components/LegalPage';
import PolicyContent from '@/app/components/PolicyContent';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContent } from '@/lib/siteContent';

export async function generateMetadata() {
  const content = await getSiteContent();
  return buildPageMetadata({
    title: content.policies.returns.title,
    description: 'Returns and refund policy for Kush World orders.',
    path: '/returns',
  });
}

export default async function Returns() {
  const content = await getSiteContent();

  return (
    <LegalPage title={content.policies.returns.title}>
      <PolicyContent body={content.policies.returns.body} />
    </LegalPage>
  );
}