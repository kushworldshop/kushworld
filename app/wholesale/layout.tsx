import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Wholesale — Bulk Hemp Products for Retailers',
  description:
    'Wholesale hemp products for verified retailers and distributors. Bulk pricing, lab COAs included. Apply to carry Kush World products.',
  path: '/wholesale',
  keywords: ['hemp wholesale', 'bulk hemp products', 'retailer hemp distributor', 'Kush World wholesale'],
});

export default function WholesaleLayout({ children }: { children: React.ReactNode }) {
  return children;
}