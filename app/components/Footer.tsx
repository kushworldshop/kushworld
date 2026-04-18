'use client';

import Link from 'next/link';
import { useWishlistStore } from '@/lib/wishlistStore';

export default function Footer() {
  const wishlistCount = useWishlistStore((state) => state.items.length);

  return (
    <footer className="bg-black border-t border-zinc-800 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="Kush World" className="h-10 w-auto" />
              <span className="text-2xl font-bold tracking-tight">KUSH WORLD</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
              Premium headshop gear • Lab tested • Discreet & insured shipping • 21+ only
            </p>
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="font-semibold text-lg mb-6 text-white">Shop</h3>
            <div className="space-y-3 text-sm">
              <Link href="/#shop" className="block text-zinc-400 hover:text-white transition">All Products</Link>
              <Link href="/#shop" className="block text-zinc-400 hover:text-white transition">Glass</Link>
              <Link href="/#shop" className="block text-zinc-400 hover:text-white transition">Pipes & Accessories</Link>
              <Link href="/#shop" className="block text-zinc-400 hover:text-white transition">Apparel</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-lg mb-6 text-white">Support</h3>
            <div className="space-y-3 text-sm">
              <a href="#" className="block text-zinc-400 hover:text-white transition">Shipping Info</a>
              <a href="#" className="block text-zinc-400 hover:text-white transition">Returns</a>
              <a href="#" className="block text-zinc-400 hover:text-white transition">Contact Us</a>
              <Link href="/account" className="block text-zinc-400 hover:text-white transition">My Account</Link>
            </div>
          </div>

          {/* Wishlist & Legal */}
          <div>
            <h3 className="font-semibold text-lg mb-6 text-white">Quick Links</h3>
            <div className="space-y-3 text-sm">
              <Link 
                href="/wishlist" 
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition group"
              >
                <span>Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="bg-[#00ff9d] text-black text-xs px-2 py-0.5 rounded-full font-mono group-hover:bg-white transition">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              
              <a href="#" className="block text-zinc-400 hover:text-white transition">Rewards Program</a>
              <a href="#" className="block text-zinc-400 hover:text-white transition">Blog</a>
              <a href="#" className="block text-zinc-400 hover:text-white transition">Age Verification</a>
            </div>

            <div className="mt-12 text-xs text-zinc-500">
              © 2026 Kush World. All Rights Reserved.<br />
              For adults 21+ only. 
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}