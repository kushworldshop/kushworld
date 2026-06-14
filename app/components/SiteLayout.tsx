'use client';

import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import SiteBranding from './SiteBranding';
// MobileBottomNav, OfflineIndicator, InstallPrompt commented out - app features not ready for public, kept in files for future launch
// import MobileBottomNav from './MobileBottomNav';
// import InstallPrompt from './InstallPrompt';
// import OfflineIndicator from './OfflineIndicator';
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
      <main className="min-h-screen bg-black text-white">{children}</main>
      <Footer />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      {/* App features (MobileBottomNav, OfflineIndicator, InstallPrompt) commented out - not ready for public display/use, files kept for future app launch */}
    </>
  );
}