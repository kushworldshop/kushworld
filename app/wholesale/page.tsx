'use client';

import { useState } from 'react';
import SiteLayout from '@/app/components/SiteLayout';
import { useSiteContent } from '@/lib/useSiteContent';

export default function Wholesale() {
  const { content } = useSiteContent();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/wholesale/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, name, email, phone, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit application');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again or email us directly.');
    } finally {
      setLoading(false);
    }
  };

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
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              required
              placeholder="Business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4"
            />
            <input
              required
              placeholder="Contact name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4"
            />
            <input
              required
              type="email"
              placeholder="Business email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4"
            />
            <input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4"
            />
            <textarea
              required
              placeholder="Tell us about your business and what products you're interested in"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00ff9d] text-black py-4 rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Apply for Wholesale'}
            </button>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <p className="text-xs text-zinc-500 text-center">
              Applications are sent to{' '}
              <a href={`mailto:${content.contact.email}`} className="text-[#00ff9d] hover:underline">
                {content.contact.email}
              </a>
            </p>
          </form>
        ) : (
          <p className="text-center text-[#00ff9d]">
            Application received! We&apos;ll contact you within 2 business days.
          </p>
        )}
      </div>
    </SiteLayout>
  );
}