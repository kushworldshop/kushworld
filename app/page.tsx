'use client';

import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Categories from './components/Categories';
import ShopSection from './components/ShopSection';
import LoyaltySection from './components/LoyaltySection';
import CartDrawer from './components/CartDrawer';
import AgeModal from './components/AgeModal';
import { useWishlistStore } from '@/lib/wishlistStore';
import Link from 'next/link';

export default function Home() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(true);

  const wishlistCount = useWishlistStore((state) => state.items.length);

  useEffect(() => {
    const loggedIn = localStorage.getItem('loggedIn');
    if (loggedIn) {
      setShowAgeModal(false);
    }
  }, []);

  const handleAgeConfirm = () => setShowAgeModal(false);
  const handleAgeCancel = () => setShowAgeModal(false);

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

      {/* Footer with Wishlist link */}
      <footer className="bg-black border-t border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex flex-wrap justify-center gap-8 text-sm text-zinc-400">
            <Link 
              href="/wishlist" 
              className="hover:text-[#00ff9d] flex items-center gap-1"
            >
              ❤️ Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
            </Link>
            <a href="#" className="hover:text-[#00ff9d]">Shipping Policy</a>
            <a href="#" className="hover:text-[#00ff9d]">Returns</a>
            <a href="#" className="hover:text-[#00ff9d]">Contact</a>
          </div>
          <p className="text-xs text-zinc-500 mt-6">
            © 2026 Kush World • 21+ Only • Lab Tested • Discreet Shipping
          </p>
        </div>
      </footer>

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />
    </>
  );
}