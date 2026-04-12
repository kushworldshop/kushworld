'use client';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Categories from './components/Categories';
import ShopSection from './components/ShopSection';
import LoyaltySection from './components/LoyaltySection';
import CartDrawer from './components/CartDrawer';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/lib/cartStore';

export default function Home() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [isOver21, setIsOver21] = useState(false);
  const totalItems = useCartStore((state) => state.totalItems());

  // Check on load
  useEffect(() => {
    const verified = localStorage.getItem('ageVerified');
    const loggedIn = localStorage.getItem('loggedIn');

    if (loggedIn) {
      setIsOver21(true);
    } else if (!verified) {
      setTimeout(() => {
        setShowAgeModal(true);
      }, 400);
    } else {
      setIsOver21(verified === 'true');
    }
  }, []);

  const handleYes = () => {
    localStorage.setItem('ageVerified', 'true');
    setIsOver21(true);
    setShowAgeModal(false);
  };

  const handleNo = () => {
    // Under 21 — still allow merch, but warn about paraphernalia
    localStorage.setItem('ageVerified', 'false');
    setIsOver21(false);
    setShowAgeModal(false);
    
    // Optional friendly message
    setTimeout(() => {
      alert("You're welcome to shop our merch & apparel! Note: Smoking accessories and glassware are for 21+ only.");
    }, 300);
  };

  // Cart count update
  useEffect(() => {
    const countEl = document.getElementById('cartCount');
    if (countEl) countEl.textContent = totalItems.toString();
  }, [totalItems]);

  return (
    <>
      {/* Age Modal */}
      {showAgeModal && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[99999]">
          <div className="bg-zinc-900 p-10 md:p-12 rounded-3xl max-w-md text-center border border-[#00ff9d]/30">
            <i className="fa-solid fa-cannabis text-7xl text-[#00ff9d] mb-8"></i>
            <h2 className="text-4xl font-bold mb-6">ARE YOU 21 OR OLDER?</h2>
            <p className="text-zinc-400 mb-10 leading-relaxed">
              You can browse and buy <span className="text-[#00ff9d]">merch & apparel</span> at any age.<br />
              Smoking accessories, bongs, pipes & glass are for 21+ only.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleNo} 
                className="flex-1 py-6 bg-zinc-800 hover:bg-zinc-700 rounded-3xl text-xl font-semibold transition"
              >
                I&apos;M UNDER 21
              </button>
              <button 
                onClick={handleYes} 
                className="flex-1 py-6 bg-[#00ff9d] text-black hover:bg-[#00ff9d]/90 rounded-3xl text-xl font-semibold transition"
              >
                YES, I&apos;M 21+
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar onCartClick={() => setIsCartOpen(true)} />
      <Hero />
      <Categories />
      <ShopSection isOver21={isOver21} />   {/* We'll update ShopSection next if needed */}
      <LoyaltySection />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}