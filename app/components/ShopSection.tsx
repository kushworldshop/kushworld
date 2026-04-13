'use client';

import ProductCard from './ProductCard';
import { products } from '@/lib/products';

export default function ShopSection() {
  return (
    <section id="shop" className="py-16 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4">Shop Our Collection</h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Premium headshop gear, apparel, and accessories. Lab-tested. Discreet shipping.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
            />
          ))}
        </div>
      </div>
    </section>
  );
}