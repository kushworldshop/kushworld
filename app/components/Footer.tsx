'use client';

import Link from 'next/link';
import { useWishlistStore } from '@/lib/wishlistStore';
import { useSiteContent } from '@/lib/useSiteContent';
import SocialButtons from '@/app/components/SocialButtons';

export default function Footer() {
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const { content } = useSiteContent();

  return (
    <footer className="bg-black border-t border-zinc-800 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <img src={content.brand.logoUrl} alt={content.brand.name} className="h-10 w-auto" />
              <span className="text-2xl font-bold tracking-tight">{content.brand.name.toUpperCase()}</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mb-6">{content.footer.tagline}</p>
            <SocialButtons size="sm" />
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-6">Shop</h3>
            <div className="space-y-3 text-sm">
              <Link href="/shop" className="block text-zinc-400 hover:text-[#00ff9d] transition">All Products</Link>
              <Link href="/shop/merch" className="block text-zinc-400 hover:text-[#00ff9d] transition">Studio Merch</Link>
              <Link href="/shop/vapes" className="block text-zinc-400 hover:text-[#00ff9d] transition">Vapes & Disposables</Link>
              <Link href="/shop/concentrates" className="block text-zinc-400 hover:text-[#00ff9d] transition">Concentrates</Link>
              <Link href="/shop/flower" className="block text-zinc-400 hover:text-[#00ff9d] transition">Exotic Flower</Link>
              <a href={content.social.studioUrl} target="_blank" rel="noopener noreferrer" className="block text-zinc-400 hover:text-[#00ff9d] transition">Kush World Studio</a>
              <Link href="/coa" className="block text-zinc-400 hover:text-[#00ff9d] transition">Lab COAs</Link>
              <Link href="/wholesale" className="block text-zinc-400 hover:text-[#00ff9d] transition">Wholesale</Link>
              <Link href="/reviews" className="block text-zinc-400 hover:text-[#00ff9d] transition">Reviews</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-6">Support</h3>
            <div className="space-y-3 text-sm">
              <Link href="/shipping-policy" className="block text-zinc-400 hover:text-[#00ff9d] transition">Shipping Policy</Link>
              <Link href="/returns" className="block text-zinc-400 hover:text-[#00ff9d] transition">Returns</Link>
              <Link href="/delivery-zones" className="block text-zinc-400 hover:text-[#00ff9d] transition">Delivery Zones</Link>
              <Link href="/contact" className="block text-zinc-400 hover:text-[#00ff9d] transition">Contact Us</Link>
              <Link href="/account" className="block text-zinc-400 hover:text-[#00ff9d] transition">My Account</Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-6">Legal</h3>
            <div className="space-y-3 text-sm">
              <Link href="/privacy-policy" className="block text-zinc-400 hover:text-[#00ff9d] transition">Privacy Policy</Link>
              <Link href="/terms" className="block text-zinc-400 hover:text-[#00ff9d] transition">Terms of Use</Link>
              <Link href="/wishlist" className="flex items-center gap-2 text-zinc-400 hover:text-[#00ff9d] transition">
                Wishlist {wishlistCount > 0 && <span className="text-[#00ff9d]">({wishlistCount})</span>}
              </Link>
            </div>
            <p className="mt-12 text-xs text-zinc-500">{content.footer.copyright}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}