'use client';

import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MerchSection from './components/MerchSection';
import LoyaltySection from './components/LoyaltySection';
import ReviewsSection from './components/ReviewsSection';
import SeoFaq from './components/SeoFaq';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import { useAgeAccess } from '@/lib/useAgeAccess';

export default function HomeClient() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isMerchOnly } = useAgeAccess();

  return (
    <>
      <Navbar onCartClick={() => setIsCartOpen(true)} />

      <main>
        <Hero merchOnly={isMerchOnly} />
        <MerchSection />
        <ReviewsSection />
        <SeoFaq />
        {!isMerchOnly && <LoyaltySection />}
      </main>

      <Footer />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}