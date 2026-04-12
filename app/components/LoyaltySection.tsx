'use client';
import { useLoyaltyStore } from '@/lib/loyaltyStore';

export default function LoyaltySection() {
  const points = useLoyaltyStore((state) => state.points);

  return (
    <section id="loyalty" className="py-24 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-5xl font-bold mb-6">Kush World Family Rewards</h2>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
          Earn points on every purchase. Refer friends. Unlock free merch, glass, and exclusive drops.
        </p>

        <div className="text-6xl font-bold text-[#00ff9d] mb-2">{points}</div>
        <p className="text-zinc-400 mb-12">Current Points Balance</p>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-zinc-900 p-10 rounded-3xl">
            <div className="text-6xl mb-6">💰</div>
            <h3 className="text-2xl font-bold mb-3">Earn Points</h3>
            <p className="text-zinc-400">1 point per $1 spent. Add items to see points grow.</p>
          </div>
          <div className="bg-zinc-900 p-10 rounded-3xl">
            <div className="text-6xl mb-6">🎁</div>
            <h3 className="text-2xl font-bold mb-3">First Order Bonus</h3>
            <p className="text-zinc-400">Free 8th or $20 off + free shipping on qualifying orders</p>
          </div>
          <div className="bg-zinc-900 p-10 rounded-3xl">
            <div className="text-6xl mb-6">👥</div>
            <h3 className="text-2xl font-bold mb-3">Refer & Earn</h3>
            <p className="text-zinc-400">Share your link. Both you and your friend get rewards.</p>
          </div>
        </div>

        <button 
          onClick={() => alert("Referral link would go here in full version")}
          className="mt-16 px-12 py-6 bg-[#00ff9d] text-black text-2xl font-semibold rounded-3xl hover:scale-105 transition"
        >
          GET YOUR REFERRAL LINK
        </button>
      </div>
    </section>
  );
}