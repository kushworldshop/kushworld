'use client';

import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import SiteBranding from './SiteBranding';
import MobileBottomNav from './MobileBottomNav';
// import InstallPrompt from './InstallPrompt'; // kept for future app launch
import OfflineIndicator from './OfflineIndicator';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';
import { useReferralStore } from '@/lib/referralStore';
import { useWishlistStore } from '@/lib/wishlistStore';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    // Rehydrate persisted stores after skipHydration to load cart/loyalty/etc from localStorage on page loads
    useCartStore.persist.rehydrate();
    useLoyaltyStore.persist.rehydrate();
    useReferralStore.persist.rehydrate();
    useWishlistStore.persist.rehydrate();
  }, []);

  return (
    <>
      <SiteBranding />
      <Navbar onCartClick={() => setIsCartOpen(true)} />
      <main className="min-h-screen bg-black text-white pb-16 md:pb-0">{children}</main>
      <Footer />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <MobileBottomNav />
      {/* <InstallPrompt /> */} {/* disabled for now - not ready for public install, kept in files for future launch */}
      <OfflineIndicator />
    </>
  );
}