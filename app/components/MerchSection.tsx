'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getHomepageMerch, getMerchSubcategoryLabel } from '@/lib/merch';
import { useSiteContent } from '@/lib/useSiteContent';
import { getProductSlug } from '@/lib/products';
import { productHasOptions } from '@/lib/productOptions';

const featured = getHomepageMerch(4);

export default function MerchSection() {
  const { content } = useSiteContent();

  return (
    <section id="merch" className="py-20 md:py-28 bg-zinc-950">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-[#00ff9d] text-xs font-semibold uppercase tracking-[0.25em] mb-4">
            {content.merchSection.eyebrow}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">{content.merchSection.title}</h2>
          <p className="text-zinc-400 max-w-md mx-auto leading-relaxed">
            {content.merchSection.subtitle} Free shipping on orders ${content.shipping.freeShippingThresholdMerch}+.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {featured.map((product) => (
            <Link
              key={product.id}
              href={`/products/${getProductSlug(product)}`}
              className="group bg-zinc-900/60 rounded-2xl overflow-hidden border border-zinc-800/80 hover:border-[#00ff9d]/30 transition"
            >
              <div className="relative aspect-square bg-white/5">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
              <div className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                  {getMerchSubcategoryLabel(product.merchSubcategory)}
                </p>
                <p className="text-sm font-medium line-clamp-2 mb-2 group-hover:text-[#00ff9d] transition">
                  {product.name}
                </p>
                <p className="text-[#00ff9d] font-bold text-sm">
                  {productHasOptions(product) ? 'From ' : ''}${product.price}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
          <Link
            href="/shop/merch"
            className="px-8 py-4 bg-[#00ff9d] text-black font-bold rounded-2xl hover:bg-[#00ff9d]/90 transition"
          >
            {content.merchSection.ctaLabel}
          </Link>
          <a
            href={content.social.studioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-[#00ff9d] transition"
          >
            {content.merchSection.studioLinkLabel}
          </a>
        </div>
      </div>
    </section>
  );
}