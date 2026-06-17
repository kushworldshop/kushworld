import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Referral Program — Earn Rewards Sharing Kush World',
  description:
    'Join the Kush World referral program. Share your link, earn loyalty points and commission when friends shop. Friends get $10 off their first order.',
  path: '/referral',
  keywords: ['Kush World referral', 'hemp referral program', 'earn rewards hemp shop'],
});

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return children;
}