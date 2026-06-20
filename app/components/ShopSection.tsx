'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from './ProductCard';
import { getProductDescription, type Product } from '@/lib/products';
import { useSiteContent } from '@/lib/useSiteContent';
import {
  filterProductsByShopCategory,
  getEnabledShopCategories,
  getShopCategoryById,
  getShopPageHeading,
  getShopPageSubheading,
  isMerchShopCategory,
  MERCH_SHOP_ID,
  normalizeShopCategoryId,
} from '@/lib/shopNavigation';

const BUDGET_FILTER_MAX = 2000;

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
  const { content } = useSiteContent();
  const nav = content.shopNavigation;
  const shopCategories = getEnabledShopCategories(nav);

  const searchParams = useSearchParams();
  const categoryParam = normalizeShopCategoryId(
    searchParams.get('category') || initialCategory || 'all'
  );

  const initialFilter = merchOnly
    ? MERCH_SHOP_ID
    : categoryParam === 'all' || isMerchShopCategory(categoryParam)
      ? categoryParam
      : getShopCategoryById(nav, categoryParam)
        ? categoryParam
        : 'all';

  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState('name-asc');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(BUDGET_FILTER_MAX);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.products) setProducts(data.products);
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    if (merchOnly) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveFilter(MERCH_SHOP_ID);
      return;
    }
    if (categoryParam && categoryParam !== 'all') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveFilter(categoryParam);
    }
  }, [merchOnly, categoryParam, initialCategory]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveSubsection(null);
  }, [activeFilter]);

  const activeCategory = getShopCategoryById(nav, activeFilter);
  const subsections = activeCategory?.subsections ?? [];

  const categoryProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = q
      ? products.filter(
          (product) =>
            product.name.toLowerCase().includes(q) ||
            product.category.toLowerCase().includes(q) ||
            getProductDescription(product).toLowerCase().includes(q)
        )
      : [...products];

    if (merchOnly || isMerchShopCategory(activeFilter)) {
      result = result.filter((product) => product.category === 'merch');
    } else if (activeFilter !== 'all') {
      result = filterProductsByShopCategory(result, nav, activeFilter, activeSubsection ?? undefined);
    } else {
      result = result.filter((product) => product.category !== 'merch');
    }

    return result;
  }, [activeFilter, activeSubsection, searchQuery, merchOnly, products, nav]);

  const priceBounds = useMemo(() => {
    if (!categoryProducts.length) return { min: 0, max: 0 };
    const prices = categoryProducts.map((product) => product.price);
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    return { min, max: Math.max(min, max) };
  }, [categoryProducts]);

  const defaultMaxPrice = Math.min(priceBounds.max, BUDGET_FILTER_MAX);

  useEffect(() => {
    setMinPrice(priceBounds.min);
    setMaxPrice(defaultMaxPrice);
  }, [priceBounds.min, defaultMaxPrice]);

  const budgetActive = minPrice > priceBounds.min || maxPrice < defaultMaxPrice;

  const filteredProducts = useMemo(() => {
    const result = categoryProducts.filter(
      (product) => product.price >= minPrice && product.price <= maxPrice
    );

    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [categoryProducts, sortBy, minPrice, maxPrice]);

  const showCategoryFilters = !merchOnly && !isMerchShopCategory(activeFilter);

  return (
    <section id="shop" className="py-16 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4">
            {getShopPageHeading(nav, activeFilter, merchOnly)}
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            {getShopPageSubheading(nav, activeFilter, merchOnly)}
          </p>
        </div>

        {showCategoryFilters && (
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                activeFilter === 'all' ? 'bg-[#00ff9d] text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              All
            </button>
            {shopCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveFilter(category.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                  activeFilter === category.id
                    ? 'bg-[#00ff9d] text-black'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        )}

        {subsections.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button
              onClick={() => setActiveSubsection(null)}
              className={`px-4 py-2 rounded-xl text-sm transition ${
                activeSubsection === null
                  ? 'bg-zinc-800 text-[#00ff9d]'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              All {activeCategory?.label}
            </button>
            {subsections.map((subsection) => (
              <button
                key={subsection.id}
                onClick={() => setActiveSubsection(subsection.id)}
                className={`px-4 py-2 rounded-xl text-sm transition ${
                  activeSubsection === subsection.id
                    ? 'bg-zinc-800 text-[#00ff9d]'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {subsection.label}
              </button>
            ))}
          </div>
        )}

        <div className="max-w-3xl mx-auto mb-10 space-y-4">
          <div className="flex flex-wrap gap-4 justify-center items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-sm text-[#00ff9d] hover:underline">
                Clear search &quot;{searchQuery}&quot;
              </button>
            )}
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-200">Budget</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                <span>
                  {filteredProducts.length} of {categoryProducts.length} products
                </span>
                {budgetActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice(priceBounds.min);
                      setMaxPrice(defaultMaxPrice);
                    }}
                    className="text-[#00ff9d] hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <p className="text-sm text-[#00ff9d]">
              ${minPrice} – ${maxPrice}
              <span className="text-zinc-500 ml-2">
                (store range ${priceBounds.min} – ${priceBounds.max}
                {priceBounds.max > BUDGET_FILTER_MAX ? ` · filter capped at $${BUDGET_FILTER_MAX}` : ''})
              </span>
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Min</span>
                  <input
                    type="number"
                    min={priceBounds.min}
                    max={maxPrice}
                    step={1}
                    value={minPrice}
                    onChange={(e) => {
                      const next = Math.min(Number(e.target.value) || 0, maxPrice);
                      setMinPrice(Math.max(priceBounds.min, Math.round(next)));
                    }}
                    className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-right text-zinc-200"
                  />
                </div>
                <input
                  type="range"
                  min={priceBounds.min}
                  max={BUDGET_FILTER_MAX}
                  step={1}
                  value={minPrice}
                  onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice))}
                  className="w-full accent-[#00ff9d]"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Max</span>
                  <input
                    type="number"
                    min={minPrice}
                    max={BUDGET_FILTER_MAX}
                    step={1}
                    value={maxPrice}
                    onChange={(e) => {
                      const next = Math.max(Number(e.target.value) || 0, minPrice);
                      setMaxPrice(Math.min(BUDGET_FILTER_MAX, Math.round(next)));
                    }}
                    className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-right text-zinc-200"
                  />
                </div>
                <input
                  type="range"
                  min={priceBounds.min}
                  max={BUDGET_FILTER_MAX}
                  step={1}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice))}
                  className="w-full accent-[#00ff9d]"
                />
              </div>
            </div>
          </div>
        </div>

        {loadingProducts ? (
          <p className="text-center text-zinc-400 py-20">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-zinc-400 py-20">
            {categoryProducts.length > 0 && budgetActive
              ? `No products between $${minPrice} and $${maxPrice} — try widening your budget.`
              : 'No products match your filters.'}
          </p>
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