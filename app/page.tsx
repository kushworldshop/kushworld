'use client';
import { useState, useEffect } from 'react';

// Use relative imports since components are inside app/components/
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Categories from './components/Categories';
import ShopSection from './components/ShopSection';
import LoyaltySection from './components/LoyaltySection';
import CartDrawer from './components/CartDrawer';
import AgeModal from './components/AgeModal';

export default function Home() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);

  useEffect(() => {
    const hasSeenAgeGate = localStorage.getItem('ageVerified');
    const isLoggedIn = !!localStorage.getItem('loggedIn');

    if (!hasSeenAgeGate && !isLoggedIn) {
      setShowAgeModal(true);
    }
  }, []);

  const handleAgeVerified = () => {
    localStorage.setItem('ageVerified', 'true');
    setShowAgeModal(false);
  };

  const handleLoginSuccess = () => {
    localStorage.setItem('loggedIn', 'true');
    setShowAgeModal(false);
  };

  return (
    <>
      <AgeModal 
        isOpen={showAgeModal} 
        onVerified={handleAgeVerified}
        onLoginSuccess={handleLoginSuccess}
      />

      <Navbar onCartClick={() => setIsCartOpen(true)} />

      <main>
        <Hero />
        <Categories />
        <ShopSection />
        <LoyaltySection />
      </main>

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />
    </>
  );
}