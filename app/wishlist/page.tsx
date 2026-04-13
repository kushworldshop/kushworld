'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useWishlistStore } from '@/lib/wishlistStore';
import { useCartStore } from '@/lib/cartStore';

export default function Wishlist() {
  const { items, removeFromWishlist } = useWishlistStore();
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAddToCart = (item: any) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
    });
    // Optional: remove from wishlist after adding
    // removeFromWishlist(item.id);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <i className="fa-solid fa-heart text-8xl text-zinc-700 mb-8"></i>
          <h1 className="text-4xl font-bold mb-4">Your Wishlist is Empty</h1>
          <p className="text-zinc-400 mb-10">Save items you love for later.</p>
          <Link 
            href="/#shop" 
            className="inline-block bg-[#00ff9d] text-black px-10 py-4 rounded-2xl font-bold text-lg hover:bg-[#00ff9d]/90"
          >
            Browse Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-5xl font-bold">Wishlist <span className="text-[#00ff9d]">({items.length})</span></h1>
          <Link href="/#shop" className="text-[#00ff9d] hover:underline">Continue Shopping →</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <div key={item.id} className="bg-zinc-900 rounded-3xl overflow-hidden">
              <div className="relative aspect-square">
                <Image 
                  src={item.image} 
                  alt={item.name} 
                  fill 
                  className="object-cover" 
                />
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
                    onClick={() => removeFromWishlist(item.id)}
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
    </div>
  );
}