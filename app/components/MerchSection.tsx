'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getFeaturedMerch, MERCH_FREE_SHIPPING, STUDIO_URL } from '@/lib/merch';
import { getProductSlug } from '@/lib/products';

const featured = getFeaturedMerch(8);

export default function MerchSection() {
  return (
    <section id="merch" className="studio-section py-24 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="studio-banner rounded-3xl overflow-hidden mb-14 relative min-h-[220px] flex items-center">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
          <Image
            src="https://cdn.shopify.com/s/files/1/0987/4125/6514/files/anuncio_edicion_especial_8c1e7659-900d-4349-8ceb-5dff9a0ceed9.png?v=1770063851&width=1200"
            alt="Kush World Studio"
            fill
            className="object-cover object-right"
            sizes="(max-width: 1200px) 100vw, 1200px"
          />
          <div className="relative z-20 p-8 md:p-12 max-w-xl">
            <p className="studio-label text-xs font-semibold uppercase tracking-[0.25em] mb-3">
              Kush World Studio
            </p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Official Merch Drop</h2>
            <p className="text-zinc-300 mb-6 leading-relaxed">
              Hoodies, tees, hats, and studio gear — same designs from{' '}
              <span className="text-[#00ff9d]">kushworldstudio.co</span>, now in the Kush World shop.
            </p>
            <p className="text-sm text-zinc-400 mb-6">
              Free shipping on studio merch orders ${MERCH_FREE_SHIPPING}+
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('filter-category', { detail: 'merch' }));
                  document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 py-4 bg-[#00ff9d] text-black font-bold rounded-2xl"
              >
                Shop All Merch
              </button>
              <a
                href={STUDIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 border border-zinc-600 rounded-2xl font-bold hover:border-[#00ff9d] transition"
              >
                Visit Studio Site
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between mb-8">
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Trending Studio Pieces</h3>
          <Link href="/#shop" className="text-sm text-[#00ff9d] hover:underline hidden sm:inline">
            View all 38 items →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {featured.map((product) => (
            <Link
              key={product.id}
              href={`/products/${getProductSlug(product)}`}
              className="studio-product-card group bg-zinc-900/80 rounded-2xl overflow-hidden border border-zinc-800 hover:border-[#00ff9d]/40 transition"
            >
              <div className="relative aspect-square bg-white/5">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <span className="absolute top-3 left-3 bg-black/80 text-[#00ff9d] text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                  Studio
                </span>
              </div>
              <div className="p-4">
                <p className="text-sm font-medium line-clamp-2 mb-2 group-hover:text-[#00ff9d] transition">
                  {product.name}
                </p>
                <p className="text-[#00ff9d] font-bold">
                  {product.sizes?.length ? 'From ' : ''}${product.price}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}