import Link from 'next/link';
import SiteLayout from '@/app/components/SiteLayout';
import BtcPaymentGuide from '@/app/components/BtcPaymentGuide';
import { normalizeYoutubeGuideUrl } from '@/lib/btcPaymentGuide';
import { getSiteContent } from '@/lib/siteContent';
import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'How to Pay with Bitcoin',
    description:
      'Step-by-step guide to paying Kush World with Bitcoin using Cash App, Coinbase, Venmo, PayPal, and other wallets. Printable PDF instructions.',
    path: '/pay-with-bitcoin',
  });
}

export default async function PayWithBitcoinPage() {
  const content = await getSiteContent();
  const youtubeUrl = normalizeYoutubeGuideUrl(content.features.paymentBitcoin.guideYoutubeUrl);

  return (
    <SiteLayout>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/checkout"
          className="no-print text-sm text-zinc-400 hover:text-[#00ff9d] mb-8 inline-block"
        >
          ← Back to checkout
        </Link>
        <p className="text-[#00ff9d] text-sm uppercase tracking-widest mb-2">Bitcoin checkout help</p>
        <h1 className="text-4xl font-bold mb-3">How to Pay with Bitcoin</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Paying with BTC is easy once you know where to tap. This guide walks through{' '}
          <strong className="text-zinc-200">Cash App</strong> (what most people use), plus Coinbase,
          Venmo, PayPal, and other wallets. Save or print this page to follow along while you pay.
        </p>
        <BtcPaymentGuide youtubeUrl={youtubeUrl} />
      </div>
    </SiteLayout>
  );
}