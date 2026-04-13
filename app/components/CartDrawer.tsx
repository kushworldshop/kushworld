'use client';
import Image from 'next/image';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCartStore();
  const { points, addPoints } = useLoyaltyStore();

  const handleCheckout = () => {
    // For now, just close and go to checkout page
    onClose();
    window.location.href = '/checkout';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-zinc-950 h-full overflow-y-auto border-l border-zinc-800">
        <div className="p-6 sticky top-0 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold">Your Cart ({items.length} items)</h2>
          <button onClick={onClose} className="text-3xl text-zinc-400 hover:text-white">×</button>
        </div>

        <div className="p-6 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              Your cart is empty
            </div>
          ) : (
            items.map((item, index) => (
              <div key={index} className="flex gap-4 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white leading-tight">{item.name}</h4>
                  
                  {item.selectedSize && (
                    <p className="text-sm text-[#00ff9d] mt-1">Size: {item.selectedSize}</p>
                  )}

                  <p className="text-[#00ff9d] font-medium mt-1">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>

                  <div className="flex items-center gap-3 mt-3">
                    <button 
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center border border-zinc-700 rounded-xl hover:bg-zinc-800"
                    >
                      −
                    </button>
                    <span className="font-mono w-6 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center border border-zinc-700 rounded-xl hover:bg-zinc-800"
                    >
                      +
                    </button>

                    <button 
                      onClick={() => removeItem(index)}
                      className="ml-auto text-red-400 hover:text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-6 space-y-4">
            <div className="flex justify-between text-lg">
              <span>Subtotal</span>
              <span className="font-bold text-[#00ff9d]">${subtotal().toFixed(2)}</span>
            </div>

            {points > 0 && (
              <div className="text-xs text-[#00ff9d]">
                You have {points} loyalty points available
              </div>
            )}

            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-[#00ff9d] text-black font-bold rounded-2xl text-lg hover:bg-[#00ff9d]/90 transition"
            >
              PROCEED TO CHECKOUT
            </button>

            <button
              onClick={clearCart}
              className="w-full py-3 text-zinc-400 hover:text-red-400 text-sm"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}