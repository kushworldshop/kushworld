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
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || '');
  const [added, setAdded] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));

  const handleAddToCart = () => {
    if (!selectedSize && product.sizes && product.sizes.length > 0) {
      alert("Please select a size first");
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      selectedSize: selectedSize || undefined,
      quantity: 1,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="bg-zinc-900 rounded-3xl overflow-hidden group relative">
      {/* Wishlist Button */}
      <button
        onClick={() => toggleWishlist({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image
        })}
        className="absolute top-4 right-4 z-10 p-3 bg-black/70 hover:bg-black rounded-full transition-all"
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
        <h3 className="font-semibold text-xl mb-1 line-clamp-2">{product.name}</h3>
        <p className="text-[#00ff9d] text-2xl font-bold mb-4">${product.price}</p>

        {/* Size Selector */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-zinc-400 mb-2">Size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 text-sm rounded-2xl border transition-all ${
                    selectedSize === size
                      ? 'bg-[#00ff9d] text-black border-[#00ff9d]'
                      : 'border-zinc-700 hover:border-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleAddToCart}
          className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
            added 
              ? 'bg-green-600 text-white' 
              : 'bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black'
          }`}
        >
          {added ? '✓ Added to Cart' : 'Quick Add'}
        </button>
      </div>
    </div>
  );
}