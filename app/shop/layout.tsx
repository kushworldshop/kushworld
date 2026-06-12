import type { Metadata } from 'next';
import SiteLayout from '@/app/components/SiteLayout';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Shop All Products — Hemp, Vapes, Concentrates & Studio Merch',
  description:
    'Browse the full Kush World catalog. Lab-tested hemp vapes, concentrates, exotic flower, mushroom products, and official Kush World Studio apparel. COAs available. Discreet shipping.',
  path: '/shop',
  keywords: ['shop hemp online', 'Kush World catalog', 'hemp products for sale', 'head shop products'],
});

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}