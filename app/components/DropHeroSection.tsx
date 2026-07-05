'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getProductSlug, type Product } from '@/lib/products';
import { useSiteContent } from '@/lib/useSiteContent';
import ProductMetaBadges from './ProductMetaBadges';

export default function DropHeroSection() {
  const { content } = useSiteContent();
  const { features } = content;
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!features.dropHero?.enabled) return;
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const match = (data?.products as Product[] | undefined)?.find(
          (item) => getProductSlug(item) === features.dropHero.productSlug
        );
        if (match) setProduct(match);
      })
      .catch(() => {});
  }, [features.dropHero?.enabled, features.dropHero?.productSlug]);

  if (!features.dropHero?.enabled || !product) return null;

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-zinc-950 to-black border-y border-zinc-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="relative aspect-square rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute top-4 left-4 bg-[#00ff9d] text-black text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              {features.dropHero.eyebrow}
            </div>
          </div>

          <div>
            <p className="text-[#00ff9d] text-xs font-semibold uppercase tracking-[0.3em] mb-4">
              ▶ {features.dropHero.headline}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{product.name}</h2>
            <div className="mb-4">
              <ProductMetaBadges product={product} size="md" />
            </div>
            <p className="text-zinc-400 leading-relaxed mb-6 line-clamp-4">
              {product.description?.split('\n\n')[0]}
            </p>
            <p className="text-[#00ff9d] text-3xl font-bold mb-6">From ${product.price}</p>

            {features.dropHero.discordEarlyAccess && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
                <p className="text-sm text-zinc-300 mb-2">
                  <i className="fa-brands fa-discord text-[#00ff9d] mr-2" />
                  Discord Verified members get early access to new drops.
                </p>
                <a
                  href={content.social.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#00ff9d] hover:underline font-semibold"
                >
                  Join Discord for early drops →
                </a>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`/products/${getProductSlug(product)}`}
                className="px-8 py-4 bg-[#00ff9d] text-black font-bold rounded-2xl text-center hover:bg-[#00ff9d]/90 transition"
              >
                Shop Drop
              </Link>
              <Link
                href="/shop/flower"
                className="px-8 py-4 border border-zinc-700 rounded-2xl font-bold text-center hover:border-[#00ff9d] transition"
              >
                View All Flower
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}