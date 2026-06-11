'use client';

import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import { products } from '@/lib/products';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'vapes', label: 'Vapes' },
  { id: 'concentrates', label: 'Concentrates' },
  { id: 'flower', label: 'Flower' },
  { id: 'mushrooms', label: 'Mushrooms' },
];

export default function ShopSection() {
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const handleCategoryFilter = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setActiveFilter(customEvent.detail);
    };

    window.addEventListener('filter-category', handleCategoryFilter);
    return () => window.removeEventListener('filter-category', handleCategoryFilter);
  }, []);

  const filteredProducts = activeFilter === 'all'
    ? products
    : products.filter((product) => product.category === activeFilter);

  return (
    <section id="shop" className="py-16 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4">Shop Our Collection</h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Authentic products. Lab-tested. Discreet shipping nationwide.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                activeFilter === filter.id
                  ? 'bg-[#00ff9d] text-black'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
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