'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { Product } from '@/lib/products';

interface CartItem extends Product {
  selectedSize?: string;
  quantity: number;
}

export default function ProductCard({ product }: { product: Product }) {
  const addToCart = useCartStore((state) => state.addItem);
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || '');

  const handleAddToCart = () => {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      alert('Please select a size');
      return;
    }

    addToCart({
      ...product,
      selectedSize: selectedSize || undefined,
      quantity: 1,
    });
  };

  return (
    <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 group hover:border-[#00ff9d]/50 transition-all">
      <div className="relative aspect-[4/3] bg-black">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-xl leading-tight">{product.name}</h3>
          <span className="text-[#00ff9d] font-bold text-xl">${product.price.toFixed(2)}</span>
        </div>

        {product.description && (
          <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{product.description}</p>
        )}

        {/* Size Selector */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Select Size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 text-sm font-medium rounded-2xl border transition-all ${
                    selectedSize === size
                      ? 'bg-[#00ff9d] text-black border-[#00ff9d]'
                      : 'border-zinc-700 hover:border-zinc-600 text-white'
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
          className="w-full py-4 bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black font-bold rounded-2xl text-lg transition-all active:scale-[0.985]"
        >
          ADD TO CART
        </button>
      </div>
    </div>
  );
}