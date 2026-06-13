'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/adminClient';
import { mergeSiteFeatures } from '@/lib/featureTypes';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/siteContentTypes';
import ProductOptionsEditor from '@/app/admin/components/ProductOptionsEditor';
import { getProductOptionGroups, type ProductOptionGroup } from '@/lib/productOptions';
import { getAllProductCategorySlugs, getSubsectionsForProductCategory } from '@/lib/shopNavigation';
import { formatCurrency, formatPercent, getProductMargin } from '@/lib/productEconomics';

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  cost?: number;
  inventory?: number;
  image: string;
  description?: string;
  category: string;
  subcategory?: string;
  optionGroups?: ProductOptionGroup[];
  sizes?: string[];
  colors?: string[];
  hidden?: boolean;
  compareAtPrice?: number;
  featured?: boolean;
  bestSeller?: boolean;
  isNew?: boolean;
  hasOverride?: boolean;
  baseName?: string;
  basePrice?: number;
  baseImage?: string;
}

type ProductDraft = ReturnType<typeof buildProductDraft>;

function buildProductDraft(
  product: AdminProduct,
  edits: Record<string, Partial<AdminProduct> & { trackInventory?: boolean }>
) {
  const patch = edits[product.id];
  const trackInventory =
    patch?.trackInventory !== undefined ? patch.trackInventory : product.inventory !== undefined;

  return {
    name: patch?.name ?? product.name,
    price: patch?.price ?? product.price,
    cost: patch?.cost ?? product.cost ?? 0,
    trackInventory,
    inventory: patch?.inventory ?? product.inventory ?? 0,
    image: patch?.image ?? product.image,
    description: patch?.description ?? product.description ?? '',
    category: patch?.category ?? product.category,
    subcategory: patch?.subcategory ?? product.subcategory ?? '',
    optionGroups: patch?.optionGroups ?? product.optionGroups ?? getProductOptionGroups(product),
    compareAtPrice: patch?.compareAtPrice ?? product.compareAtPrice ?? 0,
    featured: patch?.featured ?? product.featured ?? false,
    bestSeller: patch?.bestSeller ?? product.bestSeller ?? false,
    isNew: patch?.isNew ?? product.isNew ?? false,
  };
}

function matchesCategoryFilter(product: AdminProduct, category: string) {
  if (category === 'all') return true;
  if (category === 'merch') return product.category === 'merch';
  if (category === 'vaporizers') return product.category === 'vapes';
  return product.category === category;
}

export default function ProductsTab() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<AdminProduct> & { trackInventory?: boolean }>>({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      setMessage('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadSiteContent = async () => {
    try {
      const res = await adminFetch('/api/admin/site-content');
      if (res.ok) {
        const data = await res.json();
        setSiteContent({
          ...DEFAULT_SITE_CONTENT,
          ...(data.content || {}),
          features: mergeSiteFeatures(data.content?.features),
        });
      }
    } catch {
      // Categories fall back to defaults
    }
  };

  useEffect(() => {
    loadProducts();
    loadSiteContent();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products
      .filter((product) => matchesCategoryFilter(product, category))
      .filter((product) => {
        if (visibilityFilter === 'visible') return !product.hidden;
        if (visibilityFilter === 'hidden') return product.hidden;
        return true;
      })
      .filter((product) => {
        if (!q) return true;
        return (
          product.name.toLowerCase().includes(q) ||
          product.id.includes(q) ||
          product.category.toLowerCase().includes(q)
        );
      });
  }, [products, search, category, visibilityFilter]);

  useEffect(() => {
    if (filteredProducts.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!filteredProducts.some((product) => product.id === selectedId)) {
      setSelectedId(filteredProducts[0].id);
    }
  }, [filteredProducts, selectedId]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId]
  );

  const dirtyIds = useMemo(
    () => Object.keys(edits).filter((id) => products.some((product) => product.id === id)),
    [edits, products]
  );

  const getDraft = (product: AdminProduct) => buildProductDraft(product, edits);

  const updateDraft = (
    id: string,
    field: keyof AdminProduct | 'trackInventory',
    value: string | number | boolean | ProductOptionGroup[]
  ) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const clearEdits = (id: string) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveProduct = async (product: AdminProduct) => {
    const draft = getDraft(product);
    setSavingId(product.id);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          name: draft.name,
          price: draft.price,
          cost: draft.cost,
          trackInventory: draft.trackInventory,
          inventory: draft.trackInventory ? draft.inventory : undefined,
          image: draft.image,
          description: draft.description,
          optionGroups: draft.optionGroups,
          category: draft.category,
          subcategory: draft.subcategory,
          compareAtPrice: draft.compareAtPrice > 0 ? draft.compareAtPrice : 0,
          featured: draft.featured,
          bestSeller: draft.bestSeller,
          isNew: draft.isNew,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Saved ${draft.name}`);
        clearEdits(product.id);
        await loadProducts();
      } else {
        setMessage(data.error || 'Failed to save product');
      }
    } catch {
      setMessage('Failed to save product');
    } finally {
      setSavingId(null);
    }
  };

  const saveAllDirty = async () => {
    if (dirtyIds.length === 0) return;
    setSavingAll(true);
    setMessage('');
    let saved = 0;
    let failed = 0;

    for (const id of dirtyIds) {
      const product = products.find((item) => item.id === id);
      if (!product) continue;
      try {
        const draft = getDraft(product);
        const res = await adminFetch('/api/admin/products', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: product.id,
            name: draft.name,
            price: draft.price,
            cost: draft.cost,
            trackInventory: draft.trackInventory,
            inventory: draft.trackInventory ? draft.inventory : undefined,
            image: draft.image,
            description: draft.description,
            optionGroups: draft.optionGroups,
            category: draft.category,
            subcategory: draft.subcategory,
            compareAtPrice: draft.compareAtPrice > 0 ? draft.compareAtPrice : 0,
            featured: draft.featured,
            bestSeller: draft.bestSeller,
            isNew: draft.isNew,
          }),
        });
        const data = await res.json();
        if (data.success) {
          saved += 1;
          clearEdits(product.id);
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }

    await loadProducts();
    if (failed === 0) {
      setMessage(`Saved ${saved} product${saved === 1 ? '' : 's'}`);
    } else {
      setMessage(`Saved ${saved}, failed ${failed}`);
    }
    setSavingAll(false);
  };

  const toggleVisibility = async (product: AdminProduct) => {
    const nextHidden = !product.hidden;
    setTogglingVisibilityId(product.id);
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, hidden: nextHidden }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(nextHidden ? `Hidden ${product.name}` : `Unhidden ${product.name}`);
        await loadProducts();
      } else {
        setMessage(data.error || 'Failed to update visibility');
      }
    } catch {
      setMessage('Failed to update visibility');
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  const uploadImage = async (product: AdminProduct, file: File) => {
    setUploadingImageId(product.id);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('productId', product.id);
      formData.append('image', file);

      const res = await adminFetch('/api/admin/products/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setMessage(`Image uploaded for ${product.name}`);
        clearEdits(product.id);
        await loadProducts();
      } else {
        setMessage(data.error || 'Failed to upload image');
      }
    } catch {
      setMessage('Failed to upload image');
    } finally {
      setUploadingImageId(null);
    }
  };

  return (
    <div className="mb-10">
      <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-3xl mb-6">
        <h2 className="text-2xl font-bold mb-2">Product Catalog</h2>
        <p className="text-zinc-400 text-sm mb-4">
          Quick-edit price and stock from the list, then open a product for the full editor. Cost is admin-only.
          Inventory restores when you approve a cancel or refund.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {dirtyIds.length > 0 && (
            <button
              onClick={saveAllDirty}
              disabled={savingAll}
              className="bg-[#00ff9d] text-black px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {savingAll ? 'Saving all...' : `Save ${dirtyIds.length} change${dirtyIds.length === 1 ? '' : 's'}`}
            </button>
          )}
          <button
            onClick={loadProducts}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {message && <p className="text-sm text-[#00ff9d]">{message}</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6 min-h-[640px]">
        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 flex flex-col max-h-[calc(100vh-12rem)] lg:max-h-[calc(100vh-10rem)]">
          <div className="space-y-3 mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            />
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
              >
                <option value="all">All categories</option>
                <option value="vaporizers">Vaporizers</option>
                <option value="concentrates">Concentrates</option>
                <option value="flower">Flower</option>
                <option value="edibles">Edibles</option>
                <option value="pre-rolls">Pre Rolls</option>
                <option value="accessories">Accessories</option>
                <option value="mushrooms">Mushrooms</option>
                <option value="merch">Merch</option>
              </select>
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value as 'all' | 'visible' | 'hidden')}
                className="flex-1 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-zinc-500 mb-3 px-1">
            {loading ? 'Loading...' : `${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'}`}
            {dirtyIds.length > 0 && (
              <span className="text-amber-300 ml-2">· {dirtyIds.length} unsaved</span>
            )}
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredProducts.map((product) => {
              const draft = getDraft(product);
              const dirty = !!edits[product.id];
              const active = product.id === selectedId;
              const stockTracked = draft.trackInventory;
              const stock = draft.inventory;
              const lowStock = stockTracked && stock <= 5;

              return (
                <div
                  key={product.id}
                  className={`rounded-2xl border transition ${
                    active
                      ? 'border-[#00ff9d] bg-[#00ff9d]/10'
                      : product.hidden
                        ? 'border-zinc-800 bg-black/30 opacity-80 hover:border-zinc-600'
                        : 'border-zinc-800 bg-black/40 hover:border-zinc-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(product.id)}
                    className="w-full text-left px-3 pt-3 pb-2 flex items-start gap-3"
                  >
                    <img
                      src={draft.image}
                      alt=""
                      className="w-12 h-12 object-cover rounded-lg border border-zinc-700 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="font-medium text-sm truncate flex-1">{draft.name}</p>
                        {dirty && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" title="Unsaved changes" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] text-zinc-500">
                        <span className="capitalize">{product.category}</span>
                        {product.hidden && <span className="text-amber-400">Hidden</span>}
                        {product.hasOverride && <span className="text-[#00ff9d]">Custom</span>}
                        {draft.featured && <span>Featured</span>}
                        {draft.bestSeller && <span>Best seller</span>}
                        {draft.isNew && <span>New</span>}
                      </div>
                    </div>
                  </button>

                  <div
                    className="px-3 pb-3 flex flex-wrap items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      $
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={draft.price}
                        onChange={(e) => updateDraft(product.id, 'price', Number(e.target.value))}
                        className="w-20 bg-black border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white"
                      />
                    </label>
                    {stockTracked ? (
                      <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        Stock
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={stock}
                          onChange={(e) => updateDraft(product.id, 'inventory', Number(e.target.value))}
                          className={`w-16 bg-black border rounded-lg px-2 py-1 text-sm text-white ${
                            stock === 0
                              ? 'border-red-700'
                              : lowStock
                                ? 'border-amber-700'
                                : 'border-zinc-700'
                          }`}
                        />
                      </label>
                    ) : (
                      <span className="text-[11px] text-zinc-600">No stock tracking</span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleVisibility(product)}
                      disabled={togglingVisibilityId === product.id}
                      className="ml-auto text-[11px] px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {togglingVisibilityId === product.id
                        ? '...'
                        : product.hidden
                          ? 'Unhide'
                          : 'Hide'}
                    </button>
                    {dirty && (
                      <button
                        type="button"
                        onClick={() => saveProduct(product)}
                        disabled={savingId === product.id}
                        className="text-[11px] px-2 py-1 rounded-lg bg-[#00ff9d] text-black font-medium disabled:opacity-50"
                      >
                        {savingId === product.id ? '...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && filteredProducts.length === 0 && (
              <p className="text-center text-zinc-500 text-sm py-10">No products match your filters.</p>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 lg:p-8 overflow-y-auto max-h-[calc(100vh-12rem)] lg:max-h-[calc(100vh-10rem)]">
          {!selectedProduct ? (
            <div className="h-full flex items-center justify-center text-zinc-500">
              Select a product to edit details
            </div>
          ) : (
            <ProductDetailPanel
              product={selectedProduct}
              draft={getDraft(selectedProduct)}
              dirty={!!edits[selectedProduct.id]}
              saving={savingId === selectedProduct.id}
              togglingVisibility={togglingVisibilityId === selectedProduct.id}
              uploadingImage={uploadingImageId === selectedProduct.id}
              siteContent={siteContent}
              onDraftChange={(field, value) => updateDraft(selectedProduct.id, field, value)}
              onSave={() => saveProduct(selectedProduct)}
              onToggleVisibility={() => toggleVisibility(selectedProduct)}
              onUploadImage={(file) => uploadImage(selectedProduct, file)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ProductDetailPanel({
  product,
  draft,
  dirty,
  saving,
  togglingVisibility,
  uploadingImage,
  siteContent,
  onDraftChange,
  onSave,
  onToggleVisibility,
  onUploadImage,
}: {
  product: AdminProduct;
  draft: ProductDraft;
  dirty: boolean;
  saving: boolean;
  togglingVisibility: boolean;
  uploadingImage: boolean;
  siteContent: SiteContent;
  onDraftChange: (
    field: keyof AdminProduct | 'trackInventory',
    value: string | number | boolean | ProductOptionGroup[]
  ) => void;
  onSave: () => void;
  onToggleVisibility: () => void;
  onUploadImage: (file: File) => void;
}) {
  const margin = getProductMargin(draft.price, draft.cost > 0 ? draft.cost : undefined);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-5 mb-6">
        <img
          src={draft.image}
          alt={draft.name}
          className="w-28 h-28 object-cover rounded-2xl border border-zinc-700 flex-shrink-0"
        />
        <div className="min-w-0">
          <h3 className="text-xl font-bold truncate">{draft.name}</h3>
          <p className="text-xs text-zinc-500 mt-1">
            ID: {product.id} · {product.category}
            {product.hidden && <span className="text-amber-400 ml-2">Hidden from shop</span>}
            {product.hasOverride && <span className="text-[#00ff9d] ml-2">Customized</span>}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Name</label>
          <input
            value={draft.name}
            onChange={(e) => onDraftChange('name', e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Sell price ($)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={draft.price}
            onChange={(e) => onDraftChange('price', Number(e.target.value))}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
          <p className="text-[11px] text-zinc-500 mt-1">Customer-facing shop price</p>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Cost ($)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={draft.cost}
            onChange={(e) => onDraftChange('cost', Number(e.target.value))}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
          <p className="text-[11px] text-zinc-500 mt-1">Admin only — never shown on shop</p>
        </div>
        <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3">
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={draft.trackInventory}
              onChange={(e) => onDraftChange('trackInventory', e.target.checked)}
              className="w-4 h-4 accent-[#00ff9d]"
            />
            <span>Track inventory for this product</span>
          </label>
          {draft.trackInventory && (
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Stock count</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draft.inventory}
                  onChange={(e) => onDraftChange('inventory', Number(e.target.value))}
                  className="w-32 bg-black border border-zinc-700 rounded-xl px-4 py-3"
                />
              </div>
              {draft.inventory <= 5 && (
                <p className={`text-sm ${draft.inventory === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                  {draft.inventory === 0 ? 'Out of stock on shop' : 'Low stock'}
                </p>
              )}
            </div>
          )}
        </div>
        {margin && (
          <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm">
            <p className="text-zinc-400">
              Margin:{' '}
              <span className={margin.profit >= 0 ? 'text-[#00ff9d]' : 'text-red-400'}>
                {formatCurrency(margin.profit)} profit
              </span>{' '}
              · {formatPercent(margin.marginPercent)} margin · {formatPercent(margin.markupPercent)} markup
            </p>
          </div>
        )}
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Product category</label>
          <select
            value={draft.category}
            onChange={(e) => onDraftChange('category', e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          >
            {getAllProductCategorySlugs(siteContent.shopNavigation).map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Sub-section</label>
          <select
            value={draft.subcategory}
            onChange={(e) => onDraftChange('subcategory', e.target.value)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          >
            <option value="">None</option>
            {getSubsectionsForProductCategory(siteContent.shopNavigation, draft.category).map((subsection) => (
              <option key={subsection.id} value={subsection.id}>
                {subsection.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-zinc-500 block mb-1">Product Image</label>
          <input
            value={draft.image}
            onChange={(e) => onDraftChange('image', e.target.value)}
            placeholder="/products/uploads/your-image.jpg"
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 mb-3"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer">
              {uploadingImage ? 'Uploading...' : 'Choose Image'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploadingImage}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadImage(file);
                  e.target.value = '';
                }}
              />
            </label>
            <span className="text-xs text-zinc-500">JPG, PNG, WEBP, or GIF · max 5MB</span>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-zinc-500 block mb-1">Description</label>
          <textarea
            value={draft.description}
            onChange={(e) => onDraftChange('description', e.target.value)}
            rows={3}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
        </div>
        <ProductOptionsEditor
          value={draft.optionGroups}
          onChange={(groups) => onDraftChange('optionGroups', groups)}
        />
        <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Compare-at price ($)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={draft.compareAtPrice}
              onChange={(e) => onDraftChange('compareAtPrice', Number(e.target.value))}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            />
            <p className="text-[11px] text-zinc-500 mt-1">Set higher than sell price to show as on sale</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 space-y-3">
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => onDraftChange('featured', e.target.checked)}
                className="w-4 h-4 accent-[#00ff9d]"
              />
              <span>Featured product</span>
            </label>
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={draft.bestSeller}
                onChange={(e) => onDraftChange('bestSeller', e.target.checked)}
                className="w-4 h-4 accent-[#00ff9d]"
              />
              <span>Best seller</span>
            </label>
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={draft.isNew}
                onChange={(e) => onDraftChange('isNew', e.target.checked)}
                className="w-4 h-4 accent-[#00ff9d]"
              />
              <span>New arrival</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 mt-6 pt-5 border-t border-zinc-800">
        <button
          onClick={onToggleVisibility}
          disabled={togglingVisibility}
          className={`px-6 py-3 rounded-xl font-medium disabled:opacity-50 ${
            product.hidden
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
              : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
          }`}
        >
          {togglingVisibility ? 'Updating...' : product.hidden ? 'Unhide Product' : 'Hide Product'}
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-[#00ff9d] text-black px-6 py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Save'}
        </button>
      </div>
    </div>
  );
}