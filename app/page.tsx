'use client';

import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Categories from './components/Categories';
import ShopSection from './components/ShopSection';
import LoyaltySection from './components/LoyaltySection';
import CartDrawer from './components/CartDrawer';
import AgeModal from './components/AgeModal';

export default function Home() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(true);

  useEffect(() => {
    const loggedIn = localStorage.getItem('loggedIn');
    if (loggedIn) {
      setShowAgeModal(false);
    }
  }, []);

  const handleAgeConfirm = () => {
    setShowAgeModal(false);
  };

  const handleAgeCancel = () => {
    setShowAgeModal(false);
  };

  return (
    <>
      <AgeModal 
        isOpen={showAgeModal} 
        onConfirm={handleAgeConfirm} 
        onCancel={handleAgeCancel} 
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