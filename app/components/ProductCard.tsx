'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useWishlistStore } from '@/lib/wishlistStore';
import Link from 'next/link';
import { getCoaPdfPath, getProductSlug, type Product } from '@/lib/products';
import {
  formatSelectedOptionsLabel,
  getDefaultSelectedOptions,
  getSelectedOptionsUnitPrice,
  productHasOptions,
  validateSelectedOptions,
} from '@/lib/productOptions';
import CoaLink from './CoaLink';
import ProductOptionSelector from './ProductOptionSelector';

export default function ProductCard({ product }: { product: Product }) {
  const isMerch = product.category === 'merch';
  const [selectedOptions, setSelectedOptions] = useState(() => getDefaultSelectedOptions(product));
  const [added, setAdded] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));
  const hasOptions = productHasOptions(product);
  const unitPrice = useMemo(
    () => getSelectedOptionsUnitPrice(product, selectedOptions),
    [product, selectedOptions]
  );

  const handleAddToCart = () => {
    const validation = validateSelectedOptions(product, selectedOptions);
    if (!validation.valid) {
      alert(`Please select ${validation.missingGroup} first`);
      return;
    }

    const variantLabel = formatSelectedOptionsLabel(selectedOptions);
    addToCart({
      id: product.id,
      name: product.name,
      price: unitPrice,
      image: product.image,
      category: product.category,
      selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
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
      category: product.category,
    });
  };

  return (
    <div className="bg-zinc-900 rounded-3xl overflow-hidden group relative">
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
            {hasOptions ? 'From ' : ''}${unitPrice}
          </p>
          {product.compareAtPrice && product.compareAtPrice < product.price && (
            <p className="text-xs text-zinc-500 line-through">${product.compareAtPrice}</p>
          )}
        </div>

        <ProductOptionSelector
          product={product}
          selected={selectedOptions}
          onChange={setSelectedOptions}
          size="sm"
        />

        {!isMerch && <CoaLink coaPdf={getCoaPdfPath(product)} productName={product.name} />}

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