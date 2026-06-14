'use client';

import Link from 'next/link';
import BrandLogoLink from '@/app/components/BrandLogoLink';
import { splitHeadline } from '@/lib/siteContentTypes';
import { useSiteContent } from '@/lib/useSiteContent';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {
  const { content } = useSiteContent();
  const variant = merchOnly ? content.hero.merchOnly : content.hero.fullAccess;
  const headlineLines = splitHeadline(variant.headline);

  return (
    <section className="min-h-[75vh] flex items-center relative overflow-hidden bg-black">
      {/* Animated mascot video as the full hero background — the logo guy actually smoking his joint (seamless loop) */}
      <video
        src="/mascot-smoking-loop.mp4"
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
      />
      {/* Subtle overlay for better text contrast over the animated character bg */}
      <div className="absolute inset-0 bg-black/45 z-10" />

      <BrandLogoLink overlay />
      <div className="relative z-20 max-w-4xl mx-auto px-6 text-center py-20 text-white">
        <p className="text-[#00ff9d] text-xs font-semibold uppercase tracking-[0.3em] mb-6">
          {variant.eyebrow}
        </p>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 tracking-tight">
          {headlineLines.map((line, index) => (
            <span key={line}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
          {variant.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/shop/merch"
            className="w-full sm:w-auto px-10 py-5 bg-[#00ff9d] text-black text-lg font-semibold rounded-2xl hover:scale-[1.02] active:scale-[0.985] transition text-center"
          >
            {variant.primaryCtaLabel}
          </Link>
          {!merchOnly && variant.secondaryCtaLabel && (
            <Link
              href="/shop"
              className="w-full sm:w-auto px-10 py-5 border border-zinc-600 text-zinc-200 text-lg font-semibold rounded-2xl hover:border-[#00ff9d] hover:text-[#00ff9d] active:bg-zinc-900 transition text-center"
            >
              {variant.secondaryCtaLabel}
            </Link>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12 text-xs text-zinc-300 uppercase tracking-wider">
          {variant.badges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </div>
    </section>
  );
}