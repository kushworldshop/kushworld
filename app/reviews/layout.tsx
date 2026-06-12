import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Customer Reviews — Verified Kush World Feedback',
  description:
    'Read verified Kush World customer reviews. Real feedback on hemp products, shipping, and studio merch from our community.',
  path: '/reviews',
  keywords: ['Kush World reviews', 'hemp shop reviews', 'lab tested hemp reviews'],
});

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}