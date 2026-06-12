'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from './ProductCard';
import { products, searchProducts } from '@/lib/products';

const filters = [
  { id: 'all', label: 'All' },
  { id: 'merch', label: 'Studio Merch' },
  { id: 'vapes', label: 'Vapes' },
  { id: 'concentrates', label: 'Concentrates' },
  { id: 'flower', label: 'Flower' },
  { id: 'mushrooms', label: 'Mushrooms' },
];

const sortOptions = [
  { id: 'name-asc', label: 'Name A–Z' },
  { id: 'name-desc', label: 'Name Z–A' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
];

export default function ShopSection({
  merchOnly = false,
  initialCategory,
}: {
  merchOnly?: boolean;
  initialCategory?: string;
}) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || initialCategory;
  const initialFilter = merchOnly
    ? 'merch'
    : categoryParam && filters.some((f) => f.id === categoryParam)
      ? categoryParam
      : 'all';
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState('name-asc');
  const [maxPrice, setMaxPrice] = useState(2000);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const handleCategoryFilter = (event: Event) => {
      setActiveFilter((event as CustomEvent<string>).detail);
    };
    const handleSearch = (event: Event) => {
      setSearchQuery((event as CustomEvent<string>).detail);
    };

    window.addEventListener('filter-category', handleCategoryFilter);
    window.addEventListener('product-search', handleSearch);
    return () => {
      window.removeEventListener('filter-category', handleCategoryFilter);
      window.removeEventListener('product-search', handleSearch);
    };
  }, []);

  useEffect(() => {
    if (merchOnly) {
      setActiveFilter('merch');
      return;
    }
    if (categoryParam && filters.some((f) => f.id === categoryParam)) {
      setActiveFilter(categoryParam);
    }
  }, [merchOnly, categoryParam, initialCategory]);

  const visibleFilters = merchOnly ? filters.filter((f) => f.id === 'merch') : filters;

  const filteredProducts = useMemo(() => {
    let result = searchQuery ? searchProducts(searchQuery) : [...products];

    if (merchOnly) {
      result = result.filter((p) => p.category === 'merch');
    } else if (activeFilter !== 'all') {
      result = result.filter((p) => p.category === activeFilter);
    }

    result = result.filter((p) => p.price <= maxPrice);

    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc': return a.price - b.price;
        case 'price-desc': return b.price - a.price;
        case 'name-desc': return b.name.localeCompare(a.name);
        default: return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [activeFilter, searchQuery, sortBy, maxPrice, merchOnly]);

  return (
    <section id="shop" className="py-16 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4">
            {merchOnly ? 'All Studio Merch' : 'Shop Our Collection'}
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            {merchOnly
              ? 'Official Kush World Studio apparel and accessories. Free shipping on orders $100+.'
              : 'Authentic products. Lab-tested with COAs. Discreet shipping nationwide.'}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {visibleFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                activeFilter === filter.id ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 mb-10 justify-center items-center">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm"
          >
            {sortOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>

          <label className="flex items-center gap-3 text-sm text-zinc-400">
            Max price: ${maxPrice}
            <input
              type="range"
              min={5}
              max={2000}
              step={5}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-32 accent-[#00ff9d]"
            />
          </label>

          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-sm text-[#00ff9d] hover:underline">
              Clear search &quot;{searchQuery}&quot;
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <p className="text-center text-zinc-400 py-20">No products match your filters.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}