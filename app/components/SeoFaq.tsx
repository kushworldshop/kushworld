'use client';

import Link from 'next/link';
import { useSiteContent } from '@/lib/useSiteContent';

export default function SeoFaq() {
  const { content } = useSiteContent();

  return (
    <section id="faq" className="py-20 bg-zinc-950 border-t border-zinc-900">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{content.faq.title}</h2>
        <p className="text-zinc-400 text-center mb-12">{content.faq.subtitle}</p>
        <div className="space-y-4">
          {content.faq.items.map((faq) => (
            <details
              key={faq.question}
              className="group bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 open:border-[#00ff9d]/30"
            >
              <summary className="font-semibold cursor-pointer list-none flex justify-between items-center gap-4">
                {faq.question}
                <span className="text-[#00ff9d] text-xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-zinc-400 mt-4 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
        <p className="text-center text-sm text-zinc-500 mt-10">
          More questions?{' '}
          <Link href="/contact" className="text-[#00ff9d] hover:underline">
            Contact us
          </Link>{' '}
          or browse our{' '}
          <Link href="/coa" className="text-[#00ff9d] hover:underline">
            lab COAs
          </Link>
          .
        </p>
      </div>
    </section>
  );
}