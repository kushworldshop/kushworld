'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useWishlistStore } from '@/lib/wishlistStore';
import Link from 'next/link';
import { getCoaPdfPath, getProductSlug, type Product } from '@/lib/products';
import CoaLink from './CoaLink';

export default function ProductCard({ product }: { product: Product }) {
  const isMerch = product.category === 'merch';
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || '');
  const [selectedColor, setSelectedColor] = useState<string>(product.colors?.[0] || '');
  const [added, setAdded] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));

  const handleAddToCart = () => {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      alert("Please select a size first");
      return;
    }

    const variantLabel = [selectedSize, selectedColor].filter(Boolean).join(' / ');
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
      selectedSize: variantLabel || undefined,
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

      {isMerch && (
        <span className="absolute top-4 left-4 z-10 bg-black/80 text-[#00ff9d] text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
          Studio
        </span>
      )}

      <Link href={`/products/${getProductSlug(product)}`} className={`relative aspect-square block ${isMerch ? 'bg-white/5' : ''}`}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          className={`${isMerch ? 'object-contain p-4' : 'object-cover'} group-hover:scale-105 transition-transform duration-500`}
        />
      </Link>

      <div className="p-6">
        <Link href={`/products/${getProductSlug(product)}`}>
          <h3 className="font-semibold text-xl line-clamp-2 mb-2 hover:text-[#00ff9d] transition">{product.name}</h3>
        </Link>
        <div className="mb-4">
          <p className="text-[#00ff9d] text-2xl font-bold">
            {product.sizes?.length ? 'From ' : ''}${product.price}
          </p>
          {product.compareAtPrice && product.compareAtPrice < product.price && (
            <p className="text-xs text-zinc-500 line-through">${product.compareAtPrice}</p>
          )}
        </div>

        {/* Size Selector */}
        {product.colors && product.colors.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-zinc-400 mb-2">COLOR</p>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-3 py-1.5 text-xs rounded-xl transition-all ${
                    selectedColor === color
                      ? 'bg-[#00ff9d] text-black font-medium'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}

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

        {!isMerch && <CoaLink coaPdf={getCoaPdfPath(product)} productName={product.name} />}

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          className={`w-full mt-3 py-4 rounded-2xl font-bold text-lg transition-all ${
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