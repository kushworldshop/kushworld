'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/products';
import { getActiveShopBrands, type ShopBrand } from '@/lib/productBrands';

export default function BrandRowSection() {
  const [brands, setBrands] = useState<ShopBrand[]>([]);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const products = (data?.products as Product[] | undefined) ?? [];
        setBrands(getActiveShopBrands(products));
      })
      .catch(() => {});
  }, []);

  if (brands.length === 0) return null;

  return (
    <section className="py-16 px-6 border-y border-zinc-900 bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        <p className="text-[#00ff9d] text-xs font-semibold uppercase tracking-[0.3em] mb-3 text-center">
          In the shop
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Names we keep stocked</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={brand.href}
              className="px-6 py-3 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-[#00ff9d] hover:text-[#00ff9d] transition font-semibold"
            >
              {brand.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
