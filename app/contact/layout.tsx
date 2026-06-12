import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact Kush World — Orders, COAs & Wholesale',
  description:
    'Contact Kush World for order support, COA questions, wholesale inquiries, and shipping help. We respond within 24–48 hours.',
  path: '/contact',
  keywords: ['contact Kush World', 'kushworld support', 'hemp wholesale inquiry'],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}