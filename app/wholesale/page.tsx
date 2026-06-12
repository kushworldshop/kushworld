'use client';

import { useState } from 'react';
import SiteLayout from '@/app/components/SiteLayout';

export default function Wholesale() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-4">Wholesale Program</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Interested in carrying Kush World products? We offer bulk pricing for verified retailers and distributors.
          All wholesale products include lab COAs.
        </p>

        <div className="bg-zinc-900 rounded-2xl p-8 border border-[#00ff9d]/30 mb-10">
          <h2 className="font-bold text-lg mb-4">Wholesale Benefits</h2>
          <ul className="space-y-3 text-zinc-300 text-sm">
            <li>✓ Volume tier pricing on concentrates & flower</li>
            <li>✓ Full COA documentation per batch</li>
            <li>✓ Discreet bulk shipping</li>
            <li>✓ Dedicated account manager</li>
          </ul>
        </div>

        {!submitted ? (
          <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
            <input required placeholder="Business name" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4" />
            <input required placeholder="Contact name" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4" />
            <input required type="email" placeholder="Business email" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4" />
            <input placeholder="Phone" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4" />
            <textarea required placeholder="Tell us about your business and what products you're interested in" rows={4} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4" />
            <button type="submit" className="w-full bg-[#00ff9d] text-black py-4 rounded-xl font-bold">
              Apply for Wholesale
            </button>
          </form>
        ) : (
          <p className="text-center text-[#00ff9d]">Application received! We&apos;ll contact you within 2 business days.</p>
        )}
      </div>
    </SiteLayout>
  );
}