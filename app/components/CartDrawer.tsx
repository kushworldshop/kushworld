'use client';
import { useCartStore } from '@/lib/cartStore';
import Image from 'next/image';
import Link from 'next/link';
import { useLoyaltyStore } from '@/lib/loyaltyStore';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeFromCart, updateQuantity, subtotal, clearCart } = useCartStore();
  const { points } = useLoyaltyStore();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-[9998] md:hidden" 
          onClick={onClose}
        />
      )}

      <div className={`
        fixed top-0 right-0 h-full bg-zinc-950 border-l border-zinc-800 
        transition-transform duration-300 z-[9999] flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        w-full md:w-96 lg:w-[420px]
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Your Cart</h2>
            <span className="bg-[#00ff9d] text-black text-sm font-semibold px-3 py-1 rounded-full">
              {totalItems} items
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-3xl hover:text-[#00ff9d] transition p-2"
          >
            ✕
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-6xl mb-6">🛒</p>
              <p className="text-xl text-zinc-400">Your cart is empty</p>
              <button 
                onClick={onClose}
                className="mt-8 px-8 py-4 bg-[#00ff9d] text-black rounded-3xl font-semibold"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={`${item.product.id}-${item.size}-${index}`} className="flex gap-4 bg-zinc-900 rounded-3xl p-4">
                <div className="w-24 h-24 bg-black rounded-2xl overflow-hidden flex-shrink-0">
                  <Image 
                    src={item.product.image} 
                    alt={item.product.name} 
                    width={96} 
                    height={96}
                    className="object-cover w-full h-full"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-tight pr-8">{item.product.name}</p>
                  {item.size && <p className="text-sm text-zinc-400 mt-1">Size: {item.size}</p>}
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-zinc-700 rounded-2xl">
                      <button 
                        onClick={() => updateQuantity(index, Math.max(1, item.quantity - 1))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-zinc-800 rounded-l-2xl"
                      >
                        −
                      </button>
                      <span className="px-4 font-semibold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-zinc-800 rounded-r-2xl"
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={() => removeFromCart(index)}
                      className="text-red-400 hover:text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="text-right font-medium whitespace-nowrap">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Summary */}
        {items.length > 0 && (
          <div className="border-t border-zinc-800 p-6 space-y-6">
            <div className="flex justify-between text-lg">
              <span>Subtotal</span>
              <span className="font-semibold">${subtotal().toFixed(2)}</span>
            </div>

            {points > 0 && (
              <div className="text-sm text-[#00ff9d] flex items-center gap-2">
                <i className="fa-solid fa-coins"></i>
                You have {points} loyalty points available at checkout
              </div>
            )}

            <Link 
              href="/checkout"
              onClick={onClose}
              className="block w-full py-5 bg-[#00ff9d] text-black text-center rounded-3xl font-bold text-xl hover:bg-[#00ff9d]/90 transition"
            >
              PROCEED TO CHECKOUT
            </Link>

            <button 
              onClick={() => {
                if (confirm("Clear entire cart?")) clearCart();
              }}
              className="w-full py-4 text-red-400 hover:text-red-500 text-sm"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}