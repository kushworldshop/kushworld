import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Referral Link',
  description: 'You were referred to Kush World. Shop lab-tested hemp and studio merch.',
  path: '/ref',
  noIndex: true,
});

export default function RefLayout({ children }: { children: React.ReactNode }) {
  return children;
}