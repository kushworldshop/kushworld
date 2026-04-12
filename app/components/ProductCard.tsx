'use client';
import { useCartStore } from '@/lib/cartStore';
import { Product } from '@/lib/products';
import { useState } from 'react';
import Image from 'next/image';

interface ProductCardProps {
  product: Product;
  isOver21: boolean;
}

export default function ProductCard({ product, isOver21 }: ProductCardProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const isClothing = !!(product.availableSizes && product.availableSizes.length > 0);
  const isMerch = product.category.toLowerCase().includes('merch') || 
                  product.category.toLowerCase().includes('apparel');

  const canAddToCart = isMerch || isOver21;

  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    
    // Simple localStorage wishlist
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    if (isWishlisted) {
      wishlist = wishlist.filter((p: any) => p.id !== product.id);
    } else {
      wishlist.push(product);
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    
    // Toast
    const toast = document.createElement('div');
    toast.className = "fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-6 py-3 rounded-3xl z-[99999]";
    toast.textContent = isWishlisted ? 'Removed from wishlist' : 'Added to wishlist ❤️';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const handleAddToCart = () => {
    if (!canAddToCart) {
      alert("This product is for 21+ only.");
      return;
    }

    if (isClothing && !selectedSize) {
      setShowSizeWarning(true);
      setTimeout(() => setShowSizeWarning(false), 2500);
      return;
    }

    const sizeToUse = selectedSize || 'One Size';
    for (let i = 0; i < quantity; i++) {
      addToCart(product, 1, sizeToUse);
    }

    const toast = document.createElement('div');
    toast.className = "fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#00ff9d] text-black px-8 py-4 rounded-3xl font-semibold shadow-2xl z-[99999]";
    toast.textContent = `Added ${quantity}× ${product.name} to cart!`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);

    setSelectedSize('');
    setQuantity(1);
  };

  return (
    <div className="product-card group bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 hover:border-[#00ff9d]/50 transition-all duration-300 relative">
      <div className="relative h-80 bg-black flex items-center justify-center overflow-hidden">
        <Image 
          src={product.image} 
          alt={product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {!canAddToCart && (
          <div className="absolute top-4 right-4 bg-red-600/90 text-white text-xs px-3 py-1 rounded-full font-medium">
            21+ ONLY
          </div>
        )}
        <button 
          onClick={toggleWishlist}
          className="absolute top-4 left-4 bg-black/70 hover:bg-black p-3 rounded-full transition"
        >
          <i className={`fa-solid fa-heart text-xl ${isWishlisted ? 'text-red-500' : 'text-white'}`}></i>
        </button>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-xl tracking-tight">{product.name}</h3>
            <p className="text-zinc-400 text-sm">{product.category}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-[#00ff9d]">${product.price}</span>
          </div>
        </div>

        {isClothing && (
          <div className="mb-5">
            <p className="text-xs text-zinc-400 mb-2">SIZE</p>
            <div className="flex flex-wrap gap-2">
              {product.availableSizes!.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 text-sm border rounded-xl transition-all ${
                    selectedSize === size 
                      ? 'bg-[#00ff9d] text-black border-[#00ff9d]' 
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            {showSizeWarning && <p className="text-red-400 text-sm mt-2">Please select a size</p>}
          </div>
        )}

        <div className="mb-6">
          <p className="text-xs text-zinc-400 mb-2">QUANTITY</p>
          <div className="flex items-center border border-zinc-700 rounded-2xl w-fit">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 rounded-l-2xl">−</button>
            <div className="w-12 text-center font-semibold text-lg">{quantity}</div>
            <button onClick={() => setQuantity(Math.min(99, quantity + 1))} className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 rounded-r-2xl">+</button>
          </div>
        </div>

        <button 
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className={`w-full py-4 rounded-3xl font-semibold text-lg transition-all ${
            canAddToCart 
              ? 'bg-[#00ff9d] text-black hover:bg-[#00ff9d]/90' 
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {canAddToCart ? `ADD ${quantity} TO CART` : '21+ ONLY'}
        </button>
      </div>
    </div>
  );
}