'use client';
import Image from 'next/image';
import { useCartStore } from '@/lib/cartStore';
import { useLoyaltyStore } from '@/lib/loyaltyStore';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    subtotal, 
    clearCart 
  } = useCartStore();

  const points = useLoyaltyStore((state) => state.points);

  const handleCheckout = () => {
    onClose();
    window.location.href = '/checkout';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Your Cart ({items.length} items)</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-3xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              Your cart is empty
            </div>
          ) : (
            items.map((item, index) => (
              <div key={index} className="flex gap-4 bg-zinc-900 p-4 rounded-2xl">
                <div className="w-24 h-24 relative flex-shrink-0">
                  <Image 
                    src={item.image} 
                    alt={item.name} 
                    fill 
                    className="object-cover rounded-xl" 
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white leading-tight">{item.name}</h4>
                  
                  {item.selectedSize && (
                    <p className="text-sm text-[#00ff9d] mt-1">Size: {item.selectedSize}</p>
                  )}

                  <p className="text-[#00ff9d] font-medium mt-2">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3 mt-3">
                    <button 
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white"
                    >
                      −
                    </button>
                    <span className="font-mono text-white w-6 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white"
                    >
                      +
                    </button>
                  </div>

                  <button 
                    onClick={() => removeItem(index)}
                    className="mt-3 text-red-400 hover:text-red-500 text-sm flex items-center gap-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Totals */}
        {items.length > 0 && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-950">
            <div className="flex justify-between text-lg mb-4">
              <span>Subtotal</span>
              <span className="font-bold text-[#00ff9d]">${subtotal().toFixed(2)}</span>
            </div>

            {points > 0 && (
              <div className="text-xs text-amber-400 mb-4">
                You have {points} loyalty points available
              </div>
            )}

            <button 
              onClick={handleCheckout}
              className="w-full py-4 bg-[#00ff9d] hover:bg-[#00ff9d]/90 text-black font-bold rounded-2xl mb-3 transition"
            >
              PROCEED TO CHECKOUT
            </button>

            <button 
              onClick={clearCart}
              className="w-full py-3 text-zinc-400 hover:text-red-400 text-sm transition"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}