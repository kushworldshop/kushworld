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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`relative w-full max-w-md h-full bg-zinc-950 border-l border-zinc-700 flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <h2 className="text-2xl font-bold">Your Cart</h2>
          <div className="text-sm text-zinc-400">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </div>
          <button 
            onClick={onClose}
            className="text-3xl text-zinc-400 hover:text-white transition p-2 -mr-2"
          >
            ✕
          </button>
        </div>

        {/* Cart Items - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="text-7xl mb-6 opacity-30">🛒</div>
              <p className="text-xl font-medium text-zinc-300">Your cart is empty</p>
              <p className="text-zinc-500 mt-2">Add some fire products from the shop</p>
            </div>
          ) : (
            items.map((item, index) => (
              <div 
                key={index} 
                className="flex gap-5 bg-zinc-900 p-5 rounded-3xl border border-zinc-800"
              >
                {/* Product Image */}
                <div className="w-24 h-24 relative flex-shrink-0 rounded-2xl overflow-hidden">
                  <Image 
                    src={item.image} 
                    alt={item.name} 
                    fill 
                    className="object-cover" 
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold leading-tight pr-8">{item.name}</h4>
                  
                  {item.selectedSize && (
                    <p className="text-sm text-[#00ff9d] mt-1">Size: {item.selectedSize}</p>
                  )}

                  <p className="text-[#00ff9d] font-bold mt-3 text-lg">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>

                  {/* Quantity Controls - Bigger touch targets */}
                  <div className="flex items-center gap-4 mt-4">
                    <button 
                      onClick={() => updateQuantity(index, Math.max(1, item.quantity - 1))}
                      className="w-11 h-11 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-2xl text-2xl text-white transition"
                    >
                      −
                    </button>
                    
                    <span className="font-mono text-xl w-8 text-center font-medium">
                      {item.quantity}
                    </span>
                    
                    <button 
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-11 h-11 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-2xl text-2xl text-white transition"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button 
                    onClick={() => removeItem(index)}
                    className="mt-4 text-red-400 hover:text-red-500 text-sm flex items-center gap-1.5 transition"
                  >
                    <i className="fa-solid fa-trash"></i>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer - Sticky on mobile */}
        {items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-6">
            <div className="flex justify-between items-baseline mb-6">
              <span className="text-lg">Subtotal</span>
              <span className="text-3xl font-bold text-[#00ff9d]">
                ${subtotal().toFixed(2)}
              </span>
            </div>

            {points > 0 && (
              <div className="text-sm text-amber-400 mb-5 flex items-center gap-2">
                <i className="fa-solid fa-coins"></i>
                You have <span className="font-bold">{points}</span> loyalty points
              </div>
            )}

            <button 
              onClick={handleCheckout}
              className="w-full py-5 bg-[#00ff9d] hover:bg-[#00ff9d]/90 active:bg-[#00ff9d]/80 text-black font-bold text-xl rounded-3xl transition mb-4"
            >
              PROCEED TO CHECKOUT
            </button>

            <button 
              onClick={clearCart}
              className="w-full py-3 text-zinc-400 hover:text-red-500 text-sm font-medium transition"
            >
              Clear Entire Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}