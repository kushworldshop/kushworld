'use client';
import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';
import { useState, useEffect } from 'react';

export default function Navbar({ onCartClick }: { onCartClick: () => void }) {
  const totalItems = useCartStore((state) => state.totalItems());
  const { points } = useLoyaltyStore();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const customerEmail = localStorage.getItem('customerEmail');
    const adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
    
    setIsLoggedIn(!!customerEmail || adminLoggedIn);
    setIsCustomer(!!customerEmail);
  }, []);

  const handleLogin = () => {
    if (isLoggedIn) {
      if (confirm('Logout?')) {
        localStorage.removeItem('customerEmail');
        localStorage.removeItem('adminLoggedIn');
        setIsLoggedIn(false);
        setIsCustomer(false);
        setIsMobileMenuOpen(false);
        window.location.reload();
      }
    } else {
      const isCustomerLogin = confirm('Login as Customer? (Cancel for Admin)');
      if (isCustomerLogin) {
        const email = prompt('Enter your customer email:');
        if (email) {
          localStorage.setItem('customerEmail', email);
          setIsLoggedIn(true);
          setIsCustomer(true);
          setIsMobileMenuOpen(false);
          window.location.reload();
        }
      } else {
        window.location.href = '/admin/login';
      }
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
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
            {/* Logo + Brand */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Kush World" 
                className="h-14 w-auto md:h-16" 
              />
              <Link href="/" className="text-2xl md:text-3xl font-bold tracking-tighter">
                KUSH<span className="text-[#00ff9d]">WORLD</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-10 text-lg">
              <Link href="#shop" className="hover:text-[#00ff9d] transition">Shop</Link>
              <a href="#loyalty" className="hover:text-[#00ff9d] transition">Rewards</a>
              <Link href="/account" className="hover:text-[#00ff9d] transition">Account</Link>
              <a href="#" className="hover:text-[#00ff9d] transition">Blog</a>
            </div>

            {/* Right Side - Desktop */}
            <div className="hidden md:flex items-center gap-6">
              <button className="hover:text-[#00ff9d] transition">
                <i className="fa-solid fa-magnifying-glass text-2xl"></i>
              </button>

              {/* Login Button */}
              <button 
                onClick={handleLogin} 
                className="flex items-center gap-2 hover:text-[#00ff9d] transition"
              >
                <i className="fa-solid fa-user text-xl"></i>
                <span className="hidden lg:inline">
                  {isLoggedIn 
                    ? (isCustomer ? 'My Account' : 'Admin') 
                    : 'Login'
                  }
                </span>
              </button>

              {/* Loyalty Points - Improved Styling */}
              {isLoggedIn && isCustomer && (
                <div className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 px-5 py-2.5 rounded-2xl border border-[#00ff9d]/40 transition-all">
                  <i className="fa-solid fa-coins text-[#00ff9d]"></i>
                  <div className="text-right">
                    <div className="font-semibold text-[#00ff9d] leading-none">{points}</div>
                    <div className="text-[10px] text-zinc-500 -mt-0.5">LOYALTY PTS</div>
                  </div>
                </div>
              )}

              {/* Cart Button */}
              <button 
                onClick={onCartClick} 
                className="flex items-center gap-2 relative hover:text-[#00ff9d] transition p-2"
              >
                <i className="fa-solid fa-shopping-cart text-2xl"></i>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#00ff9d] text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={toggleMobileMenu}
              className="md:hidden text-3xl hover:text-[#00ff9d] transition"
            >
              <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-black border-t border-zinc-800">
            <div className="px-6 py-8 flex flex-col gap-6 text-lg">
              <Link href="#shop" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#00ff9d] transition">Shop</Link>
              <a href="#loyalty" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#00ff9d] transition">Rewards</a>
              <Link href="/account" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#00ff9d] transition">My Account</Link>
              <a href="#" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-[#00ff9d] transition">Blog</a>

              <div className="pt-6 border-t border-zinc-800 flex flex-col gap-4">
                <button 
                  onClick={handleLogin}
                  className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 rounded-2xl transition flex items-center justify-center gap-3"
                >
                  <i className="fa-solid fa-user"></i>
                  {isLoggedIn ? 'Logout' : 'Login / Register'}
                </button>

                {/* Mobile Loyalty Points */}
                {isLoggedIn && isCustomer && (
                  <div className="flex items-center justify-center gap-3 bg-zinc-900 py-4 rounded-2xl border border-[#00ff9d]/30">
                    <i className="fa-solid fa-coins text-[#00ff9d] text-2xl"></i>
                    <div>
                      <span className="text-2xl font-bold text-[#00ff9d]">{points}</span>
                      <span className="text-sm text-zinc-400 ml-2">Loyalty Points</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}