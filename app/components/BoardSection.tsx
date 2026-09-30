'use client';

import Link from 'next/link';
import ProductCard from './ProductCard';
import type { Product } from '@/lib/products';

export default function BoardSection({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <section id="board" className="py-16 md:py-20 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/80 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-6 md:px-10 pt-8 pb-6 border-b border-zinc-800">
            <div>
              <p className="text-[#00ff9d] text-xs font-semibold uppercase tracking-[0.3em] mb-2">
                On the Board
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">What&apos;s live tonight</h2>
              <p className="text-zinc-400 mt-2 max-w-xl">
                Indoor, smalls, exotics, boxes — the menu that&apos;s actually on the shop right now.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-[#00ff9d] hover:underline font-medium shrink-0"
            >
              Shop the menu
              <i className="fa-solid fa-arrow-right text-sm" />
            </Link>
          </div>

          <div className="p-6 md:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
