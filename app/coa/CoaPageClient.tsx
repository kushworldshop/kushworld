'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SiteLayout from '@/app/components/SiteLayout';
import JsonLd from '@/app/components/JsonLd';
import { faqJsonLd } from '@/lib/seo';
import { getCoaPdfPath, getProductSlug, type Product } from '@/lib/products';
import { useAgeAccess } from '@/lib/useAgeAccess';

const COA_FAQS = [
  {
    question: 'What is a Certificate of Analysis (COA)?',
    answer:
      'A COA is a third-party lab report that verifies the potency, purity, and safety of our hemp products, including cannabinoid levels and absence of contaminants.',
  },
  {
    question: 'How do I download a COA?',
    answer:
      'On this page, click "View COA" next to any product that has a PDF uploaded. Items without a file are not listed.',
  },
  {
    question: 'Are COAs available for merch?',
    answer:
      'No, COAs apply only to our hemp-derived products (vapes, concentrates, flower, etc.). Studio merch is apparel and does not require lab testing.',
  },
];

export default function CoaPageClient({ products }: { products: Product[] }) {
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
  }, [products]);

  if (ready && isMerchOnly) {
    return (
      <SiteLayout>
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <h1 className="text-3xl font-bold mb-4">21+ Required</h1>
          <p className="text-zinc-400 mb-8">
            COAs are available for hemp products, which require age verification. You can still shop Kush World Studio merch.
          </p>
          <Link href="/shop/merch" className="inline-block bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold">
            Shop Studio Merch
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <JsonLd data={faqJsonLd(COA_FAQS)} />
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h1 className="text-5xl font-bold mb-4">Certificates of Analysis</h1>
        <p className="text-zinc-400 mb-12 max-w-2xl">
          Lab reports are listed here when a file is on the product. We do not put placeholder PDFs on items that do not have a report uploaded.
        </p>

        {products.some((product) => availability[product.id] === true) ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const coaPath = getCoaPdfPath(product);
            const available = availability[product.id];
            if (available !== true) return null;

            return (
              <div key={product.id} className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 flex gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <Image src={product.image} alt={`${product.name} — ${product.category}`} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${getProductSlug(product)}`} className="font-semibold hover:text-[#00ff9d] transition">
                    {product.name}
                  </Link>
                  <p className="text-xs text-zinc-500 mt-1 capitalize">{product.category}</p>
                  <a
                    href={coaPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#00ff9d] hover:underline"
                  >
                    <i className="fa-solid fa-file-pdf" /> View COA
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center text-zinc-400">
            No lab PDFs are uploaded yet. Product pages still show strain, size, and flavor options.
          </div>
        )}
      </div>
    </SiteLayout>
  );
}