'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLoyaltyStore } from '@/lib/loyaltyStore';
import { useSiteContent } from '@/lib/useSiteContent';

export default function LoyaltySection() {
  const localPoints = useLoyaltyStore((state) => state.points);
  const [serverPoints, setServerPoints] = useState<number | null>(null);
  const { content } = useSiteContent();

  useEffect(() => {
    fetch('/api/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setServerPoints(data.user.loyaltyPoints);
      })
      .catch(() => {});
  }, []);

  const points = serverPoints ?? localPoints;

  return (
    <section id="loyalty" className="py-24 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-5xl font-bold mb-6">{content.loyaltySection.title}</h2>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12">{content.loyaltySection.subtitle}</p>

        <div className="text-6xl font-bold text-[#00ff9d] mb-2">{points}</div>
        <p className="text-zinc-400 mb-12">Current Points Balance</p>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {content.loyaltySection.cards.map((card) => (
            <div key={card.title} className="bg-zinc-900 p-10 rounded-3xl">
              <div className="text-6xl mb-6">{card.icon}</div>
              <h3 className="text-2xl font-bold mb-3">{card.title}</h3>
              <p className="text-zinc-400">{card.body}</p>
            </div>
          ))}
        </div>

        <Link
          href="/referral"
          className="inline-block mt-16 px-12 py-6 bg-[#00ff9d] text-black text-2xl font-semibold rounded-3xl hover:scale-105 transition"
        >
          {content.loyaltySection.ctaLabel}
        </Link>
      </div>
    </section>
  );
}