'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { Product } from '@/lib/products';   // adjust the import path if your products file is elsewhere

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || '');

  // Get the addToCart function from the store
  const addToCart = useCartStore((state) => state.addToCart);

  const handleAddToCart = () => {
    addToCart({
      id: String(product.id),           // FIXED: Convert number → string
      name: product.name,
      price: product.price,
      image: product.image,
      selectedSize: selectedSize || undefined,
    });

    // Nice visual feedback
    const btn = document.getElementById(`add-btn-${product.id}`);
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Added ✓';
      setTimeout(() => {
        if (btn) btn.textContent = original || 'Quick Add';
      }, 1200);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 group">
      <div className="relative h-80">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="p-6">
        <h3 className="font-bold text-xl mb-1">{product.name}</h3>
        <p className="text-[#00ff9d] font-medium text-lg mb-4">
          ${product.price}
        </p>

        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-zinc-400 mb-2">SIZE</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 text-sm rounded-2xl border transition ${
                    selectedSize === size
                      ? 'bg-[#00ff9d] text-black border-[#00ff9d]'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          id={`add-btn-${product.id}`}
          onClick={handleAddToCart}
          className="w-full py-4 bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black font-bold rounded-2xl transition text-lg"
        >
          Quick Add
        </button>
      </div>
    </div>
  );
}