import LegalPage from '@/app/components/LegalPage';
import PolicyContent from '@/app/components/PolicyContent';
import { buildPageMetadata } from '@/lib/seo';
import { getSiteContent } from '@/lib/siteContent';

export async function generateMetadata() {
  const content = await getSiteContent();
  return buildPageMetadata({
    title: content.policies.privacy.title,
    description: 'How Kush World collects, uses, and protects your personal information when you shop at kushworld.shop.',
    path: '/privacy-policy',
  });
}

export default async function PrivacyPolicy() {
  const content = await getSiteContent();

  return (
    <LegalPage title={content.policies.privacy.title}>
      <PolicyContent body={content.policies.privacy.body} />
    </LegalPage>
  );
}