'use client';

import Image from 'next/image';
import Link from 'next/link';
import SiteLayout from '@/app/components/SiteLayout';
import { useCartStore } from '@/lib/cartStore';
import { calculateTotals, FREE_SHIPPING_THRESHOLD, MIN_ORDER_AMOUNT } from '@/lib/checkout';
import { orderRequiresIdVerification } from '@/lib/products';
import { useAgeAccess } from '@/lib/useAgeAccess';

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCartStore();
  const { isMerchOnly } = useAgeAccess();
  const hasRestrictedItems = orderRequiresIdVerification(items);
  const checkoutBlocked = isMerchOnly && hasRestrictedItems;
  const sub = subtotal();
  const totals = calculateTotals(sub);

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-10">Your Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 mb-6">Your cart is empty.</p>
            <Link href="/#shop" className="bg-[#00ff9d] text-black px-8 py-4 rounded-2xl font-bold">
              Shop Now
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-10">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-[#00ff9d]">${item.price}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => updateQuantity(index, item.quantity - 1)} className="w-8 h-8 bg-zinc-800 rounded-lg">−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(index, item.quantity + 1)} className="w-8 h-8 bg-zinc-800 rounded-lg">+</button>
                      <button onClick={() => removeItem(index)} className="ml-auto text-red-400 text-sm">Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-700 space-y-3">
              <div className="flex justify-between"><span>Subtotal</span><span>${totals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{totals.freeShipping ? 'FREE' : `$${totals.shipping.toFixed(2)}`}</span></div>
              <div className="flex justify-between font-bold text-lg border-t border-zinc-700 pt-3">
                <span>Total</span><span className="text-[#00ff9d]">${totals.total.toFixed(2)}</span>
              </div>
              {sub < FREE_SHIPPING_THRESHOLD && (
                <p className="text-xs text-zinc-500">Add ${(FREE_SHIPPING_THRESHOLD - sub).toFixed(2)} more for free shipping!</p>
              )}
              {sub < MIN_ORDER_AMOUNT && (
                <p className="text-xs text-red-400">Minimum order is ${MIN_ORDER_AMOUNT}</p>
              )}
            </div>

            {checkoutBlocked && (
              <p className="text-sm text-red-400 mt-6 text-center">
                Remove age-restricted items from your cart to checkout in merch-only mode.
              </p>
            )}

            <Link
              href="/checkout"
              className={`block w-full mt-6 py-5 rounded-2xl font-bold text-center text-lg ${
                sub >= MIN_ORDER_AMOUNT && !checkoutBlocked
                  ? 'bg-[#00ff9d] text-black'
                  : 'bg-zinc-700 text-zinc-400 pointer-events-none'
              }`}
            >
              Proceed to Checkout
            </Link>
          </>
        )}
      </div>
    </SiteLayout>
  );
}