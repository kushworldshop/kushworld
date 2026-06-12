'use client';

import { splitHeadline } from '@/lib/siteContentTypes';
import { useSiteContent } from '@/lib/useSiteContent';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {
  const { content } = useSiteContent();
  const variant = merchOnly ? content.hero.merchOnly : content.hero.fullAccess;
  const headlineLines = splitHeadline(variant.headline);

  return (
    <section className="hero-bg min-h-[75vh] flex items-center relative">
      <div className="max-w-4xl mx-auto px-6 text-center py-20">
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
          <a
            href="/shop/merch"
            className="px-10 py-5 bg-[#00ff9d] text-black text-lg font-semibold rounded-2xl hover:scale-[1.02] transition"
          >
            {variant.primaryCtaLabel}
          </a>
          {!merchOnly && variant.secondaryCtaLabel && (
            <a
              href="/shop"
              className="px-10 py-5 border border-zinc-600 text-zinc-200 text-lg font-semibold rounded-2xl hover:border-[#00ff9d] hover:text-[#00ff9d] transition"
            >
              {variant.secondaryCtaLabel}
            </a>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12 text-xs text-zinc-500 uppercase tracking-wider">
          {variant.badges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </div>
    </section>
  );
}