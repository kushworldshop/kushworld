'use client';
import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAgeAccess } from '@/lib/useAgeAccess';
import { useSiteContent } from '@/lib/useSiteContent';

export default function Navbar({ onCartClick }: { onCartClick: () => void }) {
  const totalItems = useCartStore((state) => state.totalItems());
  const localPoints = useLoyaltyStore((state) => state.points);
  const [serverPoints, setServerPoints] = useState<number | null>(null);
  const points = serverPoints ?? localPoints;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const { isMerchOnly } = useAgeAccess();
  const { content } = useSiteContent();

  useEffect(() => {
    fetch('/api/users/me')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setIsLoggedIn(true);
          setServerPoints(data.user.loyaltyPoints);
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        } else {
          setServerPoints(null);
          setIsLoggedIn(!!localStorage.getItem('currentUser'));
        }
      })
      .catch(() => setIsLoggedIn(!!localStorage.getItem('currentUser')));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/shop?q=${encodeURIComponent(searchQuery)}`);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {content.announcementBar.enabled && (
        <div className="bg-[#00ff9d] text-black py-3 text-center text-sm font-medium flex items-center justify-center gap-4 flex-wrap px-6">
          {isMerchOnly ? content.announcementBar.merchOnly : content.announcementBar.fullAccess}
        </div>
      )}

      <nav className="bg-black border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20 gap-4">
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              <img src={content.brand.logoUrl} alt={content.brand.name} className="h-12 w-auto" />
              <span className="text-xl md:text-2xl font-bold text-white tracking-tight hidden sm:inline">
                {content.brand.name.toUpperCase()}
              </span>
            </Link>

            <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#00ff9d]"
                />
              </div>
            </form>

            <div className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/shop" className="hover:text-[#00ff9d] transition">Shop</Link>
              <Link href="/#merch" className="hover:text-[#00ff9d] transition">Merch</Link>
              {!isMerchOnly && <Link href="/coa" className="hover:text-[#00ff9d] transition">COAs</Link>}
              <Link href="/reviews" className="hover:text-[#00ff9d] transition">Reviews</Link>
              <Link href="/cart" className="hover:text-[#00ff9d] transition">Cart</Link>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/account" aria-label="My account" className="hover:text-[#00ff9d] transition text-lg">
                <i className="fa-solid fa-user" />
              </Link>

              {isLoggedIn && (
                <div className="hidden md:flex items-center gap-2 text-xs bg-zinc-900 px-3 py-1.5 rounded-xl">
                  <i className="fa-solid fa-coins text-[#00ff9d]" />
                  <span>{points} pts</span>
                </div>
              )}

              <button onClick={onCartClick} className="relative hover:text-[#00ff9d] transition text-xl">
                <i className="fa-solid fa-shopping-cart" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#00ff9d] text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>

              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-xl">
                <i className="fa-solid fa-bars" />
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden py-6 border-t border-zinc-800 space-y-4">
              <form onSubmit={handleSearch}>
                <input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 text-sm"
                />
              </form>
              <Link href="/shop" className="block hover:text-[#00ff9d]">Shop</Link>
              <Link href="/#merch" className="block hover:text-[#00ff9d]">Merch</Link>
              {!isMerchOnly && <Link href="/coa" className="block hover:text-[#00ff9d]">COAs</Link>}
              <Link href="/reviews" className="block hover:text-[#00ff9d]">Reviews</Link>
              <Link href="/cart" className="block hover:text-[#00ff9d]">Cart</Link>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}