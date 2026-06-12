'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from './ProductCard';
import type { Product } from '@/lib/products';

interface ProductCollectionSectionProps {
  type: 'best-sellers' | 'new-arrivals' | 'on-sale';
  title: string;
  subtitle: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export default function ProductCollectionSection({
  type,
  title,
  subtitle,
  ctaHref = '/shop',
  ctaLabel = 'View All',
}: ProductCollectionSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/collections?type=${type}`)
      .then((res) => res.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [type]);

  if (loading || products.length === 0) return null;

  return (
    <section className="py-20 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-3">{title}</h2>
            <p className="text-zinc-400 max-w-2xl">{subtitle}</p>
          </div>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 text-[#00ff9d] hover:underline font-medium"
          >
            {ctaLabel}
            <i className="fa-solid fa-arrow-right text-sm" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}