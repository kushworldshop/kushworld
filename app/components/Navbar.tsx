'use client';
import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';
import { useState, useEffect } from 'react';

export default function Navbar({ onCartClick }: { onCartClick: () => void }) {
  const totalItems = useCartStore((state) => state.totalItems());
  const points = useLoyaltyStore((state) => state.points);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('currentUser'));
  }, []);

  const handleLoginClick = () => {
    window.location.href = '/account';
  };

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-[#00ff9d] text-black py-3 text-center text-sm font-medium flex items-center justify-center gap-4 flex-wrap px-6">
        🎁 FREE 8TH / $20 OFF FIRST ORDER • 🔥 FREE SHIPPING ON $200+ • LAB TESTED • DISCREET & INSURED
      </div>

      <nav className="bg-black border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Kush World" className="h-12 w-auto" />
              <span className="text-2xl font-bold text-white tracking-tight">KUSH WORLD</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8 text-lg">
              <Link href="#shop" className="hover:text-[#00ff9d] transition">Shop</Link>
              <Link href="#loyalty" className="hover:text-[#00ff9d] transition">Rewards</Link>
              <a href="#" className="hover:text-[#00ff9d] transition">Deals</a>
              <a href="#" className="hover:text-[#00ff9d] transition">Blog</a>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-6">
              {/* Account */}
              <button 
                onClick={handleLoginClick}
                className="flex items-center gap-2 hover:text-[#00ff9d] transition text-lg"
              >
                <i className="fa-solid fa-user"></i>
                <span className="hidden md:inline">Account</span>
              </button>

              {/* Loyalty Points (only if logged in) */}
              {isLoggedIn && (
                <div className="hidden md:flex items-center gap-2 text-sm bg-zinc-900 px-4 py-2 rounded-2xl">
                  <i className="fa-solid fa-coins text-[#00ff9d]"></i>
                  <span>{points} pts</span>
                </div>
              )}

              {/* Cart */}
              <button 
                onClick={onCartClick} 
                className="flex items-center gap-2 relative hover:text-[#00ff9d] transition text-2xl"
              >
                <i className="fa-solid fa-shopping-cart"></i>
                <span id="cartCount" className="absolute -top-1 -right-1 bg-[#00ff9d] text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              </button>

              {/* Mobile menu button */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-2xl"
              >
                <i className="fa-solid fa-bars"></i>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-6 border-t border-zinc-800">
              <div className="flex flex-col gap-6 text-lg">
                <Link href="#shop" className="hover:text-[#00ff9d]">Shop</Link>
                <Link href="#loyalty" className="hover:text-[#00ff9d]">Rewards</Link>
                <a href="#" className="hover:text-[#00ff9d]">Deals</a>
                <a href="#" className="hover:text-[#00ff9d]">Blog</a>
                <button onClick={handleLoginClick} className="text-left hover:text-[#00ff9d]">Account</button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}