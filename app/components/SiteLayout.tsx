'use client';

import { useState } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import CartDrawer from './CartDrawer';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <Navbar onCartClick={() => setIsCartOpen(true)} />
      <main className="min-h-screen bg-black text-white">{children}</main>
      <Footer />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}