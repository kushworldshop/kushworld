'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';
import {
  getCoaPdfPath,
  getProductDescription,
  getProductSlug,
  getTierPricing,
  isProductInStock,
  type Product,
} from '@/lib/products';
import GrokChat from '@/app/components/GrokChat';
import { getMerchSubcategoryLabel, MERCH_FREE_SHIPPING } from '@/lib/merch';
import { getTierPrice } from '@/lib/checkout';
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
import ProductReviews from './ProductReviews';
import { useAgeAccess } from '@/lib/useAgeAccess';
import { useSiteContent } from '@/lib/useSiteContent';
import { getShopCategoryLabel, getShopPathForProduct } from '@/lib/shopNavigation';
import { getProductMedia, type ProductMediaItem } from '@/lib/productMedia';
import ProductMediaPreview from '@/app/components/ProductMediaPreview';

export default function ProductDetail({ product }: { product: Product }) {
  const { isMerchOnly, ready } = useAgeAccess();
  const { content } = useSiteContent();
  const { features } = content;
  const isMerch = product.category === 'merch';
  const blocked = ready && isMerchOnly && !isMerch;
  const baseGallery = useMemo(() => getProductMedia(product), [product]);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState(() => getDefaultSelectedOptions(product));
  const displayGallery = useMemo(() => {
    const optionImage = getSelectedOptionsImage(product, selectedOptions);
    if (!optionImage) return baseGallery;
    const optionMedia: ProductMediaItem = { type: 'image', url: optionImage };
    return [optionMedia, ...baseGallery.filter((item) => item.url !== optionImage)];
  }, [product, selectedOptions, baseGallery]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addToCart = useCartStore((s) => s.addToCart);

  const tiers = getTierPricing(product);
  const hasOptions = productHasOptions(product);
  const inStock = isProductInStock(product);
  const unitPrice = useMemo(
    () =>
      getSelectedOptionsUnitPrice(product, selectedOptions, quantity, (basePrice, qty) =>
        getTierPrice(basePrice, qty, tiers)
      ),
    [product, selectedOptions, quantity, tiers]
  );

  const handleAdd = () => {
    if (!inStock) return;

    const validation = validateSelectedOptions(product, selectedOptions);
    if (!validation.valid) {
      alert(`Please select ${validation.missingGroup}`);
      return;
    }

    const variantLabel = formatSelectedOptionsLabel(selectedOptions);
    const cartOptionImage = getSelectedOptionsImage(product, selectedOptions);

    addToCart({
      id: product.id,
      name: product.name,
      price: unitPrice,
      image: cartOptionImage ?? product.image,
      category: product.category,
      selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      selectedSize: variantLabel || undefined,
      optionSkus: formatSelectedOptionSkus(getSelectedOptionsSkus(product, selectedOptions)),
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
          href="/shop/merch"
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
        <nav aria-label="Breadcrumb" className="text-sm text-zinc-400 mb-8">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-[#00ff9d]">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/shop" className="hover:text-[#00ff9d]">Shop</Link></li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={getShopPathForProduct(content.shopNavigation, product)}
                className="hover:text-[#00ff9d]"
              >
                {isMerch
                  ? 'Studio Merch'
                  : getShopCategoryLabel(
                      content.shopNavigation,
                      content.shopNavigation.categories.find((category) =>
                        category.productCategories.includes(product.category)
                      )?.id ?? product.category
                    )}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-zinc-300">{product.name}</li>
          </ol>
        </nav>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <div className={`relative aspect-square rounded-3xl overflow-hidden mb-4 ${isMerch ? 'bg-white/5 border border-zinc-800' : 'bg-zinc-900'}`}>
              {displayGallery[activeImage]?.type === 'video' ? (
                <video
                  src={displayGallery[activeImage].url}
                  className={`w-full h-full ${isMerch ? 'object-contain p-6' : 'object-cover'}`}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <Image
                  src={displayGallery[activeImage]?.url ?? product.image}
                  alt={`${product.name} — ${isMerch ? 'official Kush World Studio apparel' : 'premium lab-tested ' + product.category + ' with COA'} | Kush World`}
                  fill
                  className={isMerch ? 'object-contain p-6' : 'object-cover'}
                  priority
                />
              )}
            </div>
            {displayGallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {displayGallery.map((item, i) => (
                  <button
                    key={item.url}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 ${
                      activeImage === i ? 'border-[#00ff9d]' : 'border-zinc-700'
                    }`}
                  >
                    <ProductMediaPreview
                      item={item}
                      alt={`${product.name} view ${i + 1}`}
                      fill
                      className="object-contain p-1 bg-white/5"
                      videoClassName="w-full h-full object-cover"
                    />
                    {item.type === 'video' && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-bold">
                        ▶
                      </span>
                    )}
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
            {features.starRatings.enabled && (
              <div className="mb-4">
                <ProductRatingBadge productId={product.id} size="md" />
              </div>
            )}

            <div className="flex items-baseline gap-3 mb-6">
              <p className="text-3xl font-bold text-[#00ff9d]">
                {hasOptions ? 'From ' : ''}${unitPrice}
              </p>
              {product.compareAtPrice && product.compareAtPrice < product.price && (
                <p className="text-lg text-zinc-500 line-through">${product.compareAtPrice}</p>
              )}
            </div>

            <p className="text-zinc-400 leading-relaxed mb-8">{getProductDescription(product)}</p>

            <ProductOptionSelector
              product={product}
              selected={selectedOptions}
              onChange={setSelectedOptions}
            />

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

            {!inStock && (
              <div className="bg-red-950/50 border border-red-800 rounded-2xl px-5 py-4 mb-6 text-red-300 text-sm font-medium">
                Out of stock
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <label className="text-sm text-zinc-400">Qty</label>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={!inStock}
                className="w-10 h-10 bg-zinc-800 rounded-xl disabled:opacity-40"
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                disabled={!inStock}
                className="w-10 h-10 bg-zinc-800 rounded-xl disabled:opacity-40"
              >
                +
              </button>
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

            {!isMerch && features.coaLinks.enabled && (
              <CoaLink coaPdf={getCoaPdfPath(product)} productName={product.name} />
            )}

            <button
              onClick={handleAdd}
              disabled={!inStock}
              className={`w-full mt-4 py-5 rounded-2xl font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                added ? 'bg-[#00ff9d] text-black' : 'bg-white text-black hover:bg-[#00ff9d]'
              }`}
            >
              {!inStock ? 'Out of Stock' : added ? '✓ Added to Cart' : 'Add to Cart'}
            </button>

            <Link
              href="/checkout"
              className="block w-full mt-3 py-4 text-center border border-zinc-700 rounded-2xl hover:border-[#00ff9d] transition text-sm"
            >
              Go to Checkout
            </Link>
          </div>
        </div>

        {features.customerReviews.enabled && (
          <ProductReviews productId={product.id} productName={product.name} />
        )}

        {features.grokAssistant.enabled && (
          <div className="mt-10">
            <GrokChat
              mode="product"
              productSlug={getProductSlug(product)}
              title="Ask Grok about this product"
              subtitle="Questions about this item, COAs, sizing, or how it fits your order."
              placeholder={`Ask about ${product.name}...`}
              suggestedPrompts={[
                'Is this lab tested?',
                'What are the effects?',
                'Any volume discounts?',
                'Shipping time for this item?',
              ]}
            />
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-4 flex items-center gap-4 z-40">
        <div className="flex-1">
          <p className="font-bold text-sm truncate">{product.name}</p>
          <p className="text-[#00ff9d] font-bold">${unitPrice}</p>
        </div>
        <button
          onClick={handleAdd}
          disabled={!inStock}
          className="bg-[#00ff9d] text-black px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
        >
          {inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </>
  );
}