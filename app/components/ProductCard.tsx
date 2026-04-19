'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useWishlistStore } from '@/lib/wishlistStore';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  sizes?: string[];
  category: string;
}

export default function ProductCard({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || '');
  const [added, setAdded] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));

  const handleAddToCart = () => {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      alert("Please select a size first");
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      // size is removed — this fixes the TypeScript error
      quantity: 1,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleToggleWishlist = () => {
    toggleWishlist({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  };

  return (
    <div className="bg-zinc-900 rounded-3xl overflow-hidden group relative">
      {/* Wishlist Button */}
      <button
        onClick={handleToggleWishlist}
        className="absolute top-4 right-4 z-10 p-2 bg-black/70 hover:bg-black rounded-full transition-all"
      >
        <i className={`fa-solid fa-heart text-2xl transition-colors ${isInWishlist ? 'text-red-500' : 'text-zinc-400 group-hover:text-white'}`} />
      </button>

      <div className="relative aspect-square">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="p-6">
        <h3 className="font-semibold text-xl line-clamp-2 mb-2">{product.name}</h3>
        <p className="text-[#00ff9d] text-2xl font-bold mb-4">${product.price}</p>

        {/* Size Selector */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-zinc-400 mb-2">SIZE</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 text-sm rounded-2xl transition-all ${
                    selectedSize === size
                      ? 'bg-[#00ff9d] text-black font-medium'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
            added
              ? 'bg-[#00ff9d] text-black'
              : 'bg-white text-black hover:bg-[#00ff9d]'
          }`}
        >
          {added ? '✓ Added to Cart' : 'Quick Add'}
        </button>
      </div>
    </div>
  );
}