'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function MobileBottomNav() {
  const totalItems = useCartStore((state) => state.totalItems());
  const localPoints = useLoyaltyStore((state) => state.points);
  const [serverPoints, setServerPoints] = useState<number | null>(null);
  const points = serverPoints ?? localPoints;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setIsLoggedIn(true);
          setServerPoints(data.user.loyaltyPoints);
        } else {
          setIsLoggedIn(!!localStorage.getItem('currentUser'));
        }
      })
      .catch(() => setIsLoggedIn(!!localStorage.getItem('currentUser')));
  }, []);

  // Hide on desktop, show on mobile only for logged-in feel + shop
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800 z-[60] safe-bottom">
      <div className="flex items-center justify-around h-16 px-2 text-xs">
        <Link 
          href="/" 
          className={`flex flex-col items-center justify-center flex-1 py-1 ${isActive('/') ? 'text-[#00ff9d]' : 'text-zinc-400 hover:text-white'}`}
        >
          <i className="fa-solid fa-home text-xl mb-0.5" />
          <span>Home</span>
        </Link>

        <Link 
          href="/shop" 
          className={`flex flex-col items-center justify-center flex-1 py-1 ${isActive('/shop') ? 'text-[#00ff9d]' : 'text-zinc-400 hover:text-white'}`}
        >
          <i className="fa-solid fa-store text-xl mb-0.5" />
          <span>Shop</span>
        </Link>

        {isLoggedIn && (
          <Link 
            href="/account?tab=orders" 
            className={`flex flex-col items-center justify-center flex-1 py-1 ${isActive('/account') && pathname?.includes('orders') ? 'text-[#00ff9d]' : 'text-zinc-400 hover:text-white'}`}
          >
            <i className="fa-solid fa-truck text-xl mb-0.5" />
            <span>Orders</span>
          </Link>
        )}

        <Link 
          href="/account" 
          className={`flex flex-col items-center justify-center flex-1 py-1 relative ${isActive('/account') ? 'text-[#00ff9d]' : 'text-zinc-400 hover:text-white'}`}
        >
          <i className="fa-solid fa-user text-xl mb-0.5" />
          <span>Account</span>
          {isLoggedIn && points > 0 && (
            <span className="absolute -top-0.5 right-3 text-[8px] bg-[#00ff9d] text-black px-1 rounded font-bold">
              {Math.min(points, 999)}
            </span>
          )}
        </Link>

        <Link 
          href="/cart" 
          className={`flex flex-col items-center justify-center flex-1 py-1 relative ${isActive('/cart') ? 'text-[#00ff9d]' : 'text-zinc-400 hover:text-white'}`}
        >
          <i className="fa-solid fa-shopping-cart text-xl mb-0.5" />
          <span>Cart</span>
          {totalItems > 0 && (
            <span className="absolute -top-0.5 right-3 bg-[#00ff9d] text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}
