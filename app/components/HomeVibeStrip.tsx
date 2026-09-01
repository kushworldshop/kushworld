'use client';

import Link from 'next/link';
import { SHOP_VIBES } from '@/lib/productVibes';

export default function HomeVibeStrip() {
  return (
    <section className="py-12 px-6 bg-black">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-[#00ff9d] text-xs font-semibold uppercase tracking-[0.3em] mb-3">
          Find your vibe
        </p>
        <h2 className="text-3xl md:text-4xl font-bold mb-6">What are you looking for?</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {SHOP_VIBES.map((vibe) => (
            <Link
              key={vibe.id}
              href={`/shop?vibe=${vibe.id}`}
              className="px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm hover:border-[#00ff9d] hover:text-[#00ff9d] transition"
            >
              {vibe.emoji} {vibe.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
