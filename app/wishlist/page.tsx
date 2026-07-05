'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWishlistStore } from '@/lib/wishlistStore';
import { useCartStore } from '@/lib/cartStore';
import SiteLayout from '@/app/components/SiteLayout';

export default function Wishlist() {
  const router = useRouter();
  const { items, removeFromWishlist, syncFromServer, loaded } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch('/api/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then(async (data) => {
        if (data?.user) {
          setIsLoggedIn(true);
          await syncFromServer();
        } else {
          setIsLoggedIn(false);
        }
        setAuthChecked(true);
      })
      .catch(() => {
        setIsLoggedIn(false);
        setAuthChecked(true);
      });
  }, [syncFromServer]);

  const handleAddToCart = (item: { id: string; name: string; price: number; image: string; category?: string }) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      category: item.category,
      quantity: 1,
    });
  };

  if (!authChecked || (isLoggedIn && !loaded)) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center text-zinc-400">Loading wishlist...</div>
      </SiteLayout>
    );
  }

  if (!isLoggedIn) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <i className="fa-solid fa-heart text-8xl text-zinc-700 mb-8" />
            <h1 className="text-4xl font-bold mb-4">Sign in to use Wishlist</h1>
            <p className="text-zinc-400 mb-10">
              Create a free Kush World account to save items you love and come back to them later.
            </p>
            <Link
              href="/account?redirect=%2Fwishlist"
              className="inline-block bg-[#00ff9d] text-black px-10 py-4 rounded-2xl font-bold text-lg hover:bg-[#00ff9d]/90"
            >
              Sign In / Create Account
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <i className="fa-solid fa-heart text-8xl text-zinc-700 mb-8" />
            <h1 className="text-4xl font-bold mb-4">Your Wishlist is Empty</h1>
            <p className="text-zinc-400 mb-10">Tap the heart on any product to save it here.</p>
            <Link
              href="/shop"
              className="inline-block bg-[#00ff9d] text-black px-10 py-4 rounded-2xl font-bold text-lg hover:bg-[#00ff9d]/90"
            >
              Browse Shop
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-bold">
            Wishlist <span className="text-[#00ff9d]">({items.length})</span>
          </h1>
          <Link href="/shop" className="text-[#00ff9d] hover:underline">
            Continue Shopping →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <div key={item.id} className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
              <div className="relative aspect-square">
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-xl mb-2">{item.name}</h3>
                <p className="text-[#00ff9d] text-3xl font-bold mb-8">${item.price}</p>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex-1 bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black py-4 rounded-2xl font-bold"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={async () => {
                      const result = await removeFromWishlist(item.id);
                      if (result === 'login_required') {
                        router.push('/account?redirect=%2Fwishlist');
                      }
                    }}
                    className="flex-1 border border-red-600 hover:bg-red-600/10 text-red-500 py-4 rounded-2xl font-bold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}