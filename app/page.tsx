'use client';

import { Suspense, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Categories from './components/Categories';
import MerchSection from './components/MerchSection';
import ShopSection from './components/ShopSection';
import LoyaltySection from './components/LoyaltySection';
import ReviewsSection from './components/ReviewsSection';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import { useAgeAccess } from '@/lib/useAgeAccess';

export default function Home() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isMerchOnly } = useAgeAccess();

  return (
    <>
      <Navbar onCartClick={() => setIsCartOpen(true)} />

      <main>
        <Hero merchOnly={isMerchOnly} />
        <Categories merchOnly={isMerchOnly} />
        <MerchSection />
        <Suspense fallback={<div className="py-20 text-center text-zinc-400">Loading shop...</div>}>
          <ShopSection merchOnly={isMerchOnly} />
        </Suspense>
        <ReviewsSection />
        {!isMerchOnly && <LoyaltySection />}
      </main>

      <Footer />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}