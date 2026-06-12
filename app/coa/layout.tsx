import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Lab COAs — Certificates of Analysis for Every Product',
  description:
    'Download third-party lab Certificates of Analysis (COAs) for Kush World hemp products. Verify potency and purity before you buy. Transparency you can trust.',
  path: '/coa',
  keywords: ['hemp COA', 'lab certificate of analysis', 'third party lab tested hemp', 'Kush World COA'],
});

export default function CoaLayout({ children }: { children: React.ReactNode }) {
  return children;
}