'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';
import { getCoaPdfPath, getProductDescription, getTierPricing, type Product } from '@/lib/products';
import { getTierPrice } from '@/lib/checkout';
import CoaLink from './CoaLink';
import ProductReviews from './ProductReviews';

export default function ProductDetail({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addToCart = useCartStore((s) => s.addToCart);

  const tiers = getTierPricing(product);
  const unitPrice = getTierPrice(product.price, quantity, tiers);

  const handleAdd = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: unitPrice,
      image: product.image,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link href="/#shop" className="text-sm text-zinc-400 hover:text-[#00ff9d] mb-8 inline-block">
          ← Back to Shop
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-zinc-900">
            <Image src={product.image} alt={product.name} fill className="object-cover" priority />
          </div>

          <div>
            <p className="text-sm uppercase tracking-widest text-[#00ff9d] mb-2">{product.category}</p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{product.name}</h1>
            <p className="text-3xl font-bold text-[#00ff9d] mb-6">${unitPrice}</p>
            <p className="text-zinc-400 leading-relaxed mb-8">{getProductDescription(product)}</p>

            {tiers.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl p-5 mb-6 border border-zinc-700">
                <p className="text-sm font-semibold mb-3">Bulk Pricing</p>
                <div className="space-y-1 text-sm text-zinc-400">
                  <p>1+ units: ${product.price}</p>
                  {tiers.map((t) => (
                    <p key={t.minQty}>{t.minQty}+ units: ${t.price} each</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm text-zinc-400">Qty</label>
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 bg-zinc-800 rounded-xl">−</button>
              <span className="w-8 text-center font-bold">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 bg-zinc-800 rounded-xl">+</button>
            </div>

            <CoaLink coaPdf={getCoaPdfPath(product)} productName={product.name} />

            <button
              onClick={handleAdd}
              className={`w-full mt-4 py-5 rounded-2xl font-bold text-lg transition ${
                added ? 'bg-[#00ff9d] text-black' : 'bg-white text-black hover:bg-[#00ff9d]'
              }`}
            >
              {added ? '✓ Added to Cart' : 'Add to Cart'}
            </button>

            <Link
              href="/checkout"
              className="block w-full mt-3 py-4 text-center border border-zinc-700 rounded-2xl hover:border-[#00ff9d] transition text-sm"
            >
              Go to Checkout
            </Link>
          </div>
        </div>

        <ProductReviews productId={product.id} productName={product.name} />
      </div>

      {/* Sticky mobile add-to-cart */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-4 flex items-center gap-4 z-40">
        <div className="flex-1">
          <p className="font-bold text-sm truncate">{product.name}</p>
          <p className="text-[#00ff9d] font-bold">${unitPrice}</p>
        </div>
        <button onClick={handleAdd} className="bg-[#00ff9d] text-black px-6 py-3 rounded-xl font-bold text-sm">
          Add to Cart
        </button>
      </div>
    </>
  );
}