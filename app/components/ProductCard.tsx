'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useWishlistStore } from '@/lib/wishlistStore';
import Link from 'next/link';
import { getCoaPdfPath, getProductSlug, isProductInStock, type Product } from '@/lib/products';
import { EMOTES } from '@/lib/emotes';
import {
  formatSelectedOptionSkus,
  formatSelectedOptionsLabel,
  getDefaultSelectedOptions,
  getSelectedOptionsImage,
  getSelectedOptionsSkus,
  getSelectedOptionsUnitPrice,
  productHasOptions,
  validateSelectedOptions,
} from '@/lib/productOptions';
import CoaLink from './CoaLink';
import ProductOptionSelector from './ProductOptionSelector';
import ProductRatingBadge from './ProductRatingBadge';
import { useSiteContent } from '@/lib/useSiteContent';
import { isOnSale } from '@/lib/productCollections';

export default function ProductCard({ product }: { product: Product }) {
  const { content } = useSiteContent();
  const { features } = content;
  const isMerch = product.category === 'merch';
  const [selectedOptions, setSelectedOptions] = useState(() => getDefaultSelectedOptions(product));
  const [added, setAdded] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({});

  const addToCart = useCartStore((state) => state.addToCart);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(product.id));
  const hasOptions = productHasOptions(product);
  const inStock = isProductInStock(product);
  const onSale = isOnSale(product);
  const unitPrice = useMemo(
    () => getSelectedOptionsUnitPrice(product, selectedOptions),
    [product, selectedOptions]
  );

  useEffect(() => {
    fetch(`/api/products/reactions?productId=${product.id}`)
      .then((r) => r.json())
      .then((d) => setReactions(d.reactions || {}))
      .catch(() => {});
  }, [product.id]);

  const handleAddToCart = () => {
    if (!inStock) return;

    const validation = validateSelectedOptions(product, selectedOptions);
    if (!validation.valid) {
      alert(`Please select ${validation.missingGroup} first`);
      return;
    }

    const variantLabel = formatSelectedOptionsLabel(selectedOptions);
    const optionImage = getSelectedOptionsImage(product, selectedOptions);
    addToCart({
      id: product.id,
      name: product.name,
      price: unitPrice,
      image: optionImage ?? product.image,
      category: product.category,
      selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      selectedSize: variantLabel || undefined,
      optionSkus: formatSelectedOptionSkus(getSelectedOptionsSkus(product, selectedOptions)),
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

  const handleReact = async (emoteName: string) => {
    const current = reactions[emoteName] || 0;
    setReactions({ ...reactions, [emoteName]: current + 1 });
    try {
      const res = await fetch('/api/products/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, emote: emoteName }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reactions) setReactions(data.reactions);
      }
    } catch {
      setReactions(reactions);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-3xl overflow-hidden group relative">
      {features.wishlist.enabled && (
        <button
          onClick={handleToggleWishlist}
          className="absolute top-4 right-4 z-10 p-2 bg-black/70 hover:bg-black rounded-full transition-all"
        >
          <i className={`fa-solid fa-heart text-2xl transition-colors ${isInWishlist ? 'text-red-500' : 'text-zinc-400 group-hover:text-white'}`} />
        </button>
      )}

      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        {isMerch && (
          <span className="bg-black/80 text-[#00ff9d] text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            Studio
          </span>
        )}
        {features.onSale.showBadge && onSale && (
          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            Sale
          </span>
        )}
      </div>

      <Link href={`/products/${getProductSlug(product)}`} className={`relative aspect-square block ${isMerch ? 'bg-white/5' : ''}`}>
        <Image
          src={product.image}
          alt={`${product.name} — ${isMerch ? 'Kush World Studio merch' : 'lab-tested ' + product.category + ' with COA'} | Kush World`}
          fill
          className={`${isMerch ? 'object-contain p-4' : 'object-cover'} group-hover:scale-105 transition-transform duration-500`}
        />
      </Link>

      <div className="p-6">
        <Link href={`/products/${getProductSlug(product)}`}>
          <h3 className="font-semibold text-xl line-clamp-2 mb-2 hover:text-[#00ff9d] transition">{product.name}</h3>
        </Link>
        {features.starRatings.enabled && (
          <div className="mb-2">
            <ProductRatingBadge productId={product.id} />
          </div>
        )}
        <div className="mb-4">
          <p className="text-[#00ff9d] text-2xl font-bold">
            {hasOptions ? 'From ' : ''}${unitPrice}
          </p>
          {onSale && product.compareAtPrice && (
            <p className="text-xs text-zinc-500 line-through">${product.compareAtPrice}</p>
          )}
        </div>

        <ProductOptionSelector
          product={product}
          selected={selectedOptions}
          onChange={setSelectedOptions}
          size="sm"
        />

        {!isMerch && features.coaLinks.enabled && (
          <CoaLink coaPdf={getCoaPdfPath(product)} productName={product.name} />
        )}

        <div className="mt-3 flex flex-wrap gap-1 border-t border-zinc-800 pt-3">
          {EMOTES.slice(0, 6).map((emote) => {
            const count = reactions[emote.name] || 0;
            return (
              <button
                key={emote.name}
                onClick={() => handleReact(emote.name)}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] transition"
                title={emote.label}
              >
                <span className="text-[9px] leading-none font-bold text-[#00ff9d]">{emote.label.split(' ').map(w => w[0]).join('')}</span>
                {count > 0 && <span className="text-zinc-400">{count}</span>}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleAddToCart}
          disabled={!inStock}
          className={`w-full mt-3 py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            added
              ? 'bg-[#00ff9d] text-black'
              : 'bg-white text-black hover:bg-[#00ff9d]'
          }`}
        >
          {!inStock ? 'Out of Stock' : added ? '✓ Added to Cart' : 'Quick Add'}
        </button>
      </div>
    </div>
  );
}