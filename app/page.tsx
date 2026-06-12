'use client';

import { Suspense, useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Categories from './components/Categories';
import ShopSection from './components/ShopSection';
import LoyaltySection from './components/LoyaltySection';
import CartDrawer from './components/CartDrawer';
import AgeModal from './components/AgeModal';
import Footer from './components/Footer';

export default function Home() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);

  useEffect(() => {
    setShowAgeModal(localStorage.getItem('ageVerified') !== 'true');
  }, []);

  return (
    <>
      <AgeModal isOpen={showAgeModal} onConfirm={() => setShowAgeModal(false)} />

      <Navbar onCartClick={() => setIsCartOpen(true)} />

      <main>
        <Hero />
        <Categories />
        <Suspense fallback={<div className="py-20 text-center text-zinc-400">Loading shop...</div>}>
          <ShopSection />
        </Suspense>
        <LoyaltySection />
      </main>

      <Footer />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}