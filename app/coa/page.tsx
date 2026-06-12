'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SiteLayout from '@/app/components/SiteLayout';
import { products, getCoaPdfPath, getProductSlug } from '@/lib/products';
import { useAgeAccess } from '@/lib/useAgeAccess';

export default function CoaPage() {
  const { isMerchOnly, ready } = useAgeAccess();
  const [availability, setAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    products.forEach(async (product) => {
      const path = getCoaPdfPath(product);
      try {
        const res = await fetch(path, { method: 'HEAD' });
        setAvailability((prev) => ({ ...prev, [product.id]: res.ok }));
      } catch {
        setAvailability((prev) => ({ ...prev, [product.id]: false }));
      }
    });
  }, []);

  if (ready && isMerchOnly) {
    return (
      <SiteLayout>
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">21+ Required</h1>
          <p className="text-zinc-400 mb-8">
            COAs are available for hemp products, which require age verification. You can still shop Kush World Studio merch.
          </p>
          <Link href="/#merch" className="inline-block bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold">
            Shop Studio Merch
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-bold mb-4">Certificates of Analysis</h1>
        <p className="text-zinc-400 mb-12 max-w-2xl">
          Every Kush World product is lab tested. Download the COA (Certificate of Analysis) for full potency and purity results.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const coaPath = getCoaPdfPath(product);
            const available = availability[product.id];

            return (
              <div key={product.id} className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 flex gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <Image src={product.image} alt={product.name} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${getProductSlug(product)}`} className="font-semibold hover:text-[#00ff9d] transition">
                    {product.name}
                  </Link>
                  <p className="text-xs text-zinc-500 mt-1 capitalize">{product.category}</p>
                  {available === true ? (
                    <a
                      href={coaPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#00ff9d] hover:underline"
                    >
                      <i className="fa-solid fa-file-pdf" /> View COA
                    </a>
                  ) : (
                    <p className="text-xs text-zinc-500 mt-3">COA coming soon</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SiteLayout>
  );
}