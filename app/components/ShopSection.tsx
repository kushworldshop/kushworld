'use client';
import ProductCard from './ProductCard';
import { products } from '@/lib/products';
import { useState, useEffect } from 'react';

interface ShopSectionProps {
  isOver21: boolean;
}

export default function ShopSection({ isOver21 }: ShopSectionProps) {
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [recommendedProducts, setRecommendedProducts] = useState(products.slice(0, 4));

  useEffect(() => {
    if (isOver21) {
      setFilteredProducts(products);
    } else {
      const merchOnly = products.filter(product => 
        product.category.toLowerCase().includes('merch') || 
        product.category.toLowerCase().includes('apparel') ||
        product.name.toLowerCase().includes('t-shirt') ||
        product.name.toLowerCase().includes('hoodie') ||
        product.name.toLowerCase().includes('snapback')
      );
      setFilteredProducts(merchOnly);
    }

    // Simple recommendation logic: random 4 products
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    setRecommendedProducts(shuffled.slice(0, 4));
  }, [isOver21]);

  return (
    <section id="shop" className="py-20 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold tracking-tighter mb-4">
            SHOP KUSH WORLD
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            {isOver21 
              ? "Premium gear for the culture. Glass, merch, and accessories." 
              : "Merch & Apparel only — come back when you're 21+ for the full drop"}
          </p>
        </div>

        {/* Main Shop Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-20">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              isOver21={isOver21}
            />
          ))}
        </div>

        {/* Recommendations Section */}
        <div className="mt-20">
          <h2 className="text-4xl font-bold tracking-tighter mb-10 text-center">Recommended For You</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {recommendedProducts.map((product) => (
              <ProductCard 
                key={`rec-${product.id}`} 
                product={product} 
                isOver21={isOver21}
              />
            ))}
          </div>
        </div>

        {!isOver21 && (
          <div className="mt-16 text-center">
            <p className="text-[#00ff9d] text-lg font-medium">
              Want the full collection including glassware and smoking accessories?
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-6 px-10 py-4 bg-[#00ff9d] text-black rounded-3xl font-semibold hover:bg-[#00ff9d]/90 transition"
            >
              VERIFY AGE (21+)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}