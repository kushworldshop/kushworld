'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BTC_CHECKOUT_REMINDERS,
  BTC_PLATFORM_GUIDES,
  type BtcPlatformGuide,
} from '@/lib/btcPaymentGuide';

interface BtcPaymentGuideProps {
  youtubeUrl?: string | null;
  compact?: boolean;
  showPrintActions?: boolean;
}

export default function BtcPaymentGuide({
  youtubeUrl,
  compact = false,
  showPrintActions = true,
}: BtcPaymentGuideProps) {
  const [openId, setOpenId] = useState<string>('cashapp');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('print') === '1') {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const handlePrint = () => window.print();

  if (compact) {
    return (
      <div className="rounded-2xl border border-[#00ff9d]/25 bg-zinc-950/80 p-4 text-sm">
        <p className="font-semibold text-white mb-2">New to Bitcoin?</p>
        <p className="text-zinc-400 mb-3">
          Most customers use <strong className="text-zinc-200">Cash App</strong>. Step-by-step guides for
          Cash App, Coinbase, Venmo, and more:
        </p>
        <BtcGuideActionRow youtubeUrl={youtubeUrl} onPrint={handlePrint} />
      </div>
    );
  }

  return (
    <div className="btc-guide">
      {showPrintActions && (
        <div className="no-print flex flex-col sm:flex-row flex-wrap gap-3 mb-8">
          <BtcGuideActionRow youtubeUrl={youtubeUrl} onPrint={handlePrint} />
        </div>
      )}

      <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Before you send</h2>
        <ol className="list-decimal list-inside space-y-2 text-zinc-300 text-sm">
          {BTC_CHECKOUT_REMINDERS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Choose your app</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Tap a platform below for step-by-step instructions. Start with Cash App if you are unsure.
        </p>
        <div className="space-y-3">
          {BTC_PLATFORM_GUIDES.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              open={openId === platform.id}
              onToggle={() => setOpenId(openId === platform.id ? '' : platform.id)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-black/40 p-6 text-sm text-zinc-400">
        <h3 className="text-white font-semibold mb-2">Still stuck?</h3>
        <p>
          Place your order first to get the exact amount and QR code, then follow this guide. Contact us
          from the{' '}
          <Link href="/contact" className="text-[#00ff9d] hover:underline">
            contact page
          </Link>{' '}
          with your order number if payment does not detect within 30 minutes.
        </p>
      </section>

      <style jsx global>{`
        @media print {
          .no-print,
          header,
          footer,
          nav {
            display: none !important;
          }
          .btc-guide {
            color: #111;
          }
          .btc-guide h1,
          .btc-guide h2,
          .btc-guide h3,
          .btc-guide .text-white {
            color: #000 !important;
          }
          .btc-guide .text-zinc-300,
          .btc-guide .text-zinc-400,
          .btc-guide .text-zinc-500 {
            color: #333 !important;
          }
          .btc-guide .border-zinc-800,
          .btc-guide .border-\\[\\#00ff9d\\]\\/25 {
            border-color: #ccc !important;
          }
          .btc-guide .bg-zinc-900\\/50,
          .btc-guide .bg-black\\/40,
          .btc-guide .bg-zinc-950\\/80 {
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}

function BtcGuideActionRow({
  youtubeUrl,
  onPrint,
}: {
  youtubeUrl?: string | null;
  onPrint: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
      <Link
        href="/pay-with-bitcoin"
        className="inline-flex items-center justify-center gap-2 bg-[#00ff9d] text-black px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#00ff9d]/90"
      >
        Full step-by-step guide
      </Link>
      <button
        type="button"
        onClick={onPrint}
        className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm"
      >
        Print / Save as PDF
      </button>
      {youtubeUrl && (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm"
        >
          Watch video guide ↗
        </a>
      )}
    </div>
  );
}

function PlatformCard({
  platform,
  open,
  onToggle,
}: {
  platform: BtcPlatformGuide;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        platform.popular ? 'border-[#00ff9d]/40' : 'border-zinc-800'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-zinc-900/80 hover:bg-zinc-900 transition"
      >
        <div>
          <p className="font-semibold text-white flex items-center gap-2">
            {platform.name}
            {platform.popular && (
              <span className="text-[10px] uppercase tracking-wider bg-[#00ff9d]/20 text-[#00ff9d] px-2 py-0.5 rounded-full">
                Most popular
              </span>
            )}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{platform.tagline}</p>
        </div>
        <span className="text-zinc-500 text-sm shrink-0">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 bg-black/30 border-t border-zinc-800">
          <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
            {platform.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          {platform.tips && platform.tips.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-amber-200/90">
              {platform.tips.map((tip) => (
                <li key={tip}>Tip: {tip}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}