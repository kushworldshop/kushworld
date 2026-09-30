'use client';

import Link from 'next/link';
import ProductMediaPreview from './ProductMediaPreview';
import type { CustomHomepageBlock } from '@/lib/homepageCopy';

export default function HomepageCustomBlock({ block }: { block: CustomHomepageBlock }) {
  const hasCopy = Boolean(block.eyebrow || block.title || block.body || block.ctaLabel);
  const hasImage = Boolean(block.imageUrl);
  const hasVideo = Boolean(block.videoUrl);
  if (!hasCopy && !hasImage && !hasVideo) return null;

  const media = (
    url: string,
    alt: string,
    className = 'object-cover'
  ) => (
    <ProductMediaPreview
      url={url}
      alt={alt}
      fill
      className={className}
      sizes="(max-width: 768px) 100vw, 50vw"
      autoPlay
      loop
      controls={block.kind === 'video'}
    />
  );

  const copy = (
    <div className={block.imagePosition === 'background' ? 'relative z-10' : ''}>
      {block.eyebrow && (
        <p className="text-[#00ff9d] text-xs font-semibold uppercase tracking-[0.3em] mb-3">
          {block.eyebrow}
        </p>
      )}
      {block.title && <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">{block.title}</h2>}
      {block.body && (
        <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap max-w-2xl">{block.body}</p>
      )}
      {block.ctaLabel && (
        <Link
          href={block.ctaHref || '/shop'}
          className="inline-block mt-6 px-8 py-4 bg-[#00ff9d] text-black font-bold rounded-2xl"
        >
          {block.ctaLabel}
        </Link>
      )}
    </div>
  );

  if (block.imagePosition === 'background') {
    return (
      <section className="relative min-h-[50vh] flex items-center overflow-hidden bg-zinc-950">
        {hasImage && (
          <div className="absolute inset-0">
            {media(block.imageUrl, block.title || 'Homepage image', 'object-cover opacity-50')}
          </div>
        )}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">{hasCopy ? copy : null}</div>
      </section>
    );
  }

  if (block.kind === 'video' || (hasVideo && !hasImage)) {
    return (
      <section className="py-16 md:py-20 px-6 bg-black">
        <div className="max-w-5xl mx-auto grid gap-8">
          {hasCopy && copy}
          {hasVideo && (
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900">
              {media(block.videoUrl, block.title || 'Homepage video')}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (block.kind === 'imageText' && hasImage) {
    const imageFirst = block.imagePosition !== 'right';
    return (
      <section className="py-16 md:py-20 px-6 bg-zinc-950">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div
            className={`relative aspect-[4/5] md:aspect-square rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 ${
              imageFirst ? '' : 'md:order-2'
            }`}
          >
            {media(block.imageUrl, block.title || 'Homepage image')}
          </div>
          <div className={imageFirst ? '' : 'md:order-1'}>{copy}</div>
        </div>
      </section>
    );
  }

  if (hasImage) {
    return (
      <section className="py-16 md:py-20 px-6 bg-black">
        <div className="max-w-5xl mx-auto space-y-8">
          {hasCopy && copy}
          <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900">
            {media(block.imageUrl, block.title || 'Homepage image')}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-20 px-6 bg-black">
      <div className="max-w-4xl mx-auto text-center">{copy}</div>
    </section>
  );
}
