'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';
import { getCoaPdfPath, getProductDescription, getTierPricing, type Product } from '@/lib/products';
import { getMerchSubcategoryLabel, MERCH_FREE_SHIPPING } from '@/lib/merch';
import { getTierPrice } from '@/lib/checkout';
import CoaLink from './CoaLink';
import ProductReviews from './ProductReviews';
import { useAgeAccess } from '@/lib/useAgeAccess';

export default function ProductDetail({ product }: { product: Product }) {
  const { isMerchOnly, ready } = useAgeAccess();
  const isMerch = product.category === 'merch';
  const blocked = ready && isMerchOnly && !isMerch;
  const gallery = product.images?.length ? product.images : [product.image];
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || '');
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addToCart = useCartStore((s) => s.addToCart);

  const tiers = getTierPricing(product);
  const unitPrice = getTierPrice(product.price, quantity, tiers);

  const handleAdd = () => {
    if (product.sizes?.length && !selectedSize) return;
    const variantLabel = [selectedSize, selectedColor].filter(Boolean).join(' / ');

    addToCart({
      id: product.id,
      name: product.name,
      price: unitPrice,
      image: product.image,
      category: product.category,
      selectedSize: variantLabel || undefined,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (blocked) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="text-3xl font-bold mb-4">21+ Required</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          This product is only available to customers 21 and older. You can still shop official Kush World Studio merch.
        </p>
        <Link
          href="/#merch"
          className="inline-block bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold hover:bg-[#00ff9d]/90 transition"
        >
          Shop Studio Merch
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link
          href={isMerch ? '/#merch' : '/#shop'}
          className="text-sm text-zinc-400 hover:text-[#00ff9d] mb-8 inline-block"
        >
          ← Back to {isMerch ? 'Studio Merch' : 'Shop'}
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <div className={`relative aspect-square rounded-3xl overflow-hidden mb-4 ${isMerch ? 'bg-white/5 border border-zinc-800' : 'bg-zinc-900'}`}>
              <Image
                src={gallery[activeImage]}
                alt={product.name}
                fill
                className={isMerch ? 'object-contain p-6' : 'object-cover'}
                priority
              />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {gallery.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 ${
                      activeImage === i ? 'border-[#00ff9d]' : 'border-zinc-700'
                    }`}
                  >
                    <Image src={src} alt="" fill className="object-contain p-1 bg-white/5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {isMerch ? (
              <p className="text-sm uppercase tracking-[0.2em] text-[#00ff9d] mb-2">
                Kush World Studio · {getMerchSubcategoryLabel(product.merchSubcategory)}
              </p>
            ) : (
              <p className="text-sm uppercase tracking-widest text-[#00ff9d] mb-2">{product.category}</p>
            )}
            <h1 className="text-3xl md:text-5xl font-bold mb-4">{product.name}</h1>

            <div className="flex items-baseline gap-3 mb-6">
              <p className="text-3xl font-bold text-[#00ff9d]">
                {product.sizes?.length ? 'From ' : ''}${unitPrice}
              </p>
              {product.compareAtPrice && product.compareAtPrice < product.price && (
                <p className="text-lg text-zinc-500 line-through">${product.compareAtPrice}</p>
              )}
            </div>

            <p className="text-zinc-400 leading-relaxed mb-8">{getProductDescription(product)}</p>

            {product.colors && product.colors.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-zinc-400 mb-3">Color</p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-xl text-sm transition ${
                        selectedColor === color
                          ? 'bg-[#00ff9d] text-black font-medium'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-zinc-400 mb-3">Size</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-xl text-sm transition ${
                        selectedSize === size
                          ? 'bg-[#00ff9d] text-black font-medium'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isMerch && tiers.length > 0 && (
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

            {isMerch && (
              <div className="bg-zinc-900 border border-[#00ff9d]/20 rounded-2xl p-4 mb-6 text-sm text-zinc-400">
                <p className="text-[#00ff9d] font-medium mb-1">Studio merch shipping</p>
                <p>Free shipping on studio orders ${MERCH_FREE_SHIPPING}+. Custom made to order — allow up to 14 business days production.</p>
                {product.studioUrl && (
                  <a href={product.studioUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-[#00ff9d] hover:underline text-xs">
                    Also on kushworldstudio.co →
                  </a>
                )}
              </div>
            )}

            {!isMerch && <CoaLink coaPdf={getCoaPdfPath(product)} productName={product.name} />}

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