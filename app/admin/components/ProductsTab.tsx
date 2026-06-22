'use client';

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from 'react';
import { adminFetch } from '@/lib/adminClient';
import { mergeSiteFeatures } from '@/lib/featureTypes';
import { DEFAULT_SITE_CONTENT, type SiteContent } from '@/lib/siteContentTypes';
import AdminNumberInput from '@/app/admin/components/AdminNumberInput';
import ProductOptionsEditor from '@/app/admin/components/ProductOptionsEditor';
import { getProductOptionGroups, type ProductOptionGroup } from '@/lib/productOptions';
import { MERCH_SUBCATEGORIES, getMerchSubcategoryLabel } from '@/lib/merch';
import {
  ADMIN_PRODUCT_CATEGORY_TABS,
  getAllProductCategorySlugs,
  getProductCategoryLabel,
  getSubsectionsForProductCategory,
  productMatchesAdminCategoryTab,
  type AdminProductCategoryTabId,
} from '@/lib/shopNavigation';
import { formatCurrency, formatPercent, getProductMargin } from '@/lib/productEconomics';
import {
  DEFAULT_PRODUCT_DESCRIPTION_TONE,
  PRODUCT_DESCRIPTION_TONES,
  type ProductDescriptionTone,
} from '@/lib/grokProductDescriptionTones';
import {
  getProductCoverUrl,
  getProductMedia,
  removeProductMedia,
  setProductCoverMedia,
  syncProductMediaFields,
  type ProductMediaItem,
} from '@/lib/productMedia';
import ProductMediaPreview from '@/app/components/ProductMediaPreview';

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
  merchSubcategory?: string;
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
  isCustom?: boolean;
  images?: string[];
  media?: ProductMediaItem[];
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
    media: patch?.media ?? getProductMedia(product),
    description: patch?.description ?? product.description ?? '',
    category: patch?.category ?? product.category,
    subcategory: patch?.subcategory ?? product.subcategory ?? '',
    merchSubcategory: patch?.merchSubcategory ?? product.merchSubcategory ?? '',
    optionGroups: patch?.optionGroups ?? product.optionGroups ?? getProductOptionGroups(product),
    compareAtPrice: patch?.compareAtPrice ?? product.compareAtPrice ?? 0,
    featured: patch?.featured ?? product.featured ?? false,
    bestSeller: patch?.bestSeller ?? product.bestSeller ?? false,
    isNew: patch?.isNew ?? product.isNew ?? false,
  };
}

function buildProductSavePayload(productId: string, draft: ProductDraft) {
  const isMerch = draft.category === 'merch';
  const synced = syncProductMediaFields(draft.media);
  return {
    id: productId,
    name: draft.name,
    price: draft.price,
    cost: draft.cost,
    trackInventory: draft.trackInventory,
    inventory: draft.trackInventory ? draft.inventory : undefined,
    image: synced.image || draft.image,
    images: synced.images,
    media: synced.media,
    description: draft.description,
    optionGroups: draft.optionGroups,
    category: draft.category,
    subcategory: isMerch ? '' : draft.subcategory,
    merchSubcategory: isMerch ? draft.merchSubcategory : '',
    compareAtPrice: draft.compareAtPrice > 0 ? draft.compareAtPrice : 0,
    featured: draft.featured,
    bestSeller: draft.bestSeller,
    isNew: draft.isNew,
  };
}

export default function ProductsTab() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<AdminProduct> & { trackInventory?: boolean }>>({});
  const [search, setSearch] = useState('');
  const [categoryTab, setCategoryTab] = useState<AdminProductCategoryTabId>('all');
  const [merchTypeFilter, setMerchTypeFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [bulkVisibility, setBulkVisibility] = useState<'hide' | 'unhide' | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [descriptionMessage, setDescriptionMessage] = useState('');
  const [descriptionTone, setDescriptionTone] = useState<ProductDescriptionTone>(
    DEFAULT_PRODUCT_DESCRIPTION_TONE
  );
  const [bulkGrokProgress, setBulkGrokProgress] = useState<{
    current: number;
    total: number;
    name: string;
  } | null>(null);
  const [importDragActive, setImportDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importCategory, setImportCategory] = useState('flower');
  const [importPrice, setImportPrice] = useState(700);
  const [importMessage, setImportMessage] = useState('');
  const [importResults, setImportResults] = useState<
    Array<{ strain: string; status: string; message?: string }>
  >([]);

  const grokEnabled = siteContent.features.grokAssistant.enabled;

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
      .filter((product) => productMatchesAdminCategoryTab(product, categoryTab))
      .filter((product) => {
        if (categoryTab !== 'merch' || merchTypeFilter === 'all') return true;
        const draft = buildProductDraft(product, edits);
        return draft.merchSubcategory === merchTypeFilter;
      })
      .filter((product) => {
        if (visibilityFilter === 'visible') return !product.hidden;
        if (visibilityFilter === 'hidden') return product.hidden;
        return true;
      })
      .filter((product) => {
        if (!q) return true;
        const draft = buildProductDraft(product, edits);
        return (
          product.name.toLowerCase().includes(q) ||
          product.id.includes(q) ||
          product.category.toLowerCase().includes(q) ||
          draft.merchSubcategory.toLowerCase().includes(q) ||
          getMerchSubcategoryLabel(draft.merchSubcategory).toLowerCase().includes(q)
        );
      });
  }, [products, search, categoryTab, merchTypeFilter, visibilityFilter, edits]);

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

  const hideableCount = useMemo(
    () => filteredProducts.filter((product) => !product.hidden).length,
    [filteredProducts]
  );

  const unhideableCount = useMemo(
    () => filteredProducts.filter((product) => product.hidden).length,
    [filteredProducts]
  );

  const bulkVisibilityLabel = useMemo(() => {
    const parts: string[] = [];
    if (search.trim()) parts.push(`matching "${search.trim()}"`);
    if (categoryTab !== 'all') {
      const tab = ADMIN_PRODUCT_CATEGORY_TABS.find((item) => item.id === categoryTab);
      parts.push(`in ${tab?.label ?? categoryTab}`);
    }
    if (categoryTab === 'merch' && merchTypeFilter !== 'all') {
      parts.push(getMerchSubcategoryLabel(merchTypeFilter).toLowerCase());
    }
    if (visibilityFilter === 'visible') parts.push('currently visible');
    if (visibilityFilter === 'hidden') parts.push('currently hidden');
    return parts.length > 0 ? parts.join(', ') : 'all products';
  }, [search, categoryTab, merchTypeFilter, visibilityFilter]);

  const getDraft = (product: AdminProduct) => buildProductDraft(product, edits);

  const updateMediaDraft = (id: string, media: ProductMediaItem[]) => {
    const synced = syncProductMediaFields(media);
    setEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        media: synced.media,
        image: synced.image,
      },
    }));
  };

  const updateDraft = (
    id: string,
    field: keyof AdminProduct | 'trackInventory',
    value: string | number | boolean | ProductOptionGroup[] | ProductMediaItem[]
  ) => {
    setEdits((prev) => {
      const patch = { ...prev[id], [field]: value };
      if (field === 'category') {
        if (value === 'merch') {
          patch.subcategory = '';
        } else {
          patch.merchSubcategory = '';
        }
      }
      return { ...prev, [id]: patch };
    });
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
        body: JSON.stringify(buildProductSavePayload(product.id, draft)),
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
          body: JSON.stringify(buildProductSavePayload(product.id, draft)),
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

  const setBulkVisibilityForFiltered = async (hidden: boolean) => {
    const targets = filteredProducts.filter((product) => product.hidden !== hidden);
    if (targets.length === 0) {
      setMessage(hidden ? 'No visible products to hide' : 'No hidden products to unhide');
      return;
    }

    const action = hidden ? 'hide' : 'unhide';
    const confirmed = window.confirm(
      `${hidden ? 'Hide' : 'Unhide'} ${targets.length} product${targets.length === 1 ? '' : 's'} (${bulkVisibilityLabel})?`
    );
    if (!confirmed) return;

    setBulkVisibility(hidden ? 'hide' : 'unhide');
    setMessage('');
    try {
      const res = await adminFetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: targets.map((product) => product.id),
          hidden,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(
          `${hidden ? 'Hidden' : 'Unhidden'} ${data.updated ?? targets.length} product${
            (data.updated ?? targets.length) === 1 ? '' : 's'
          }`
        );
        await loadProducts();
      } else {
        setMessage(data.error || `Failed to ${action} products`);
      }
    } catch {
      setMessage(`Failed to ${action} products`);
    } finally {
      setBulkVisibility(null);
    }
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

  const requestGrokDescription = async (
    product: AdminProduct,
    draft: ProductDraft,
    tone: ProductDescriptionTone
  ): Promise<{ success: true; description: string } | { success: false; error: string }> => {
    const res = await adminFetch('/api/admin/products/description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        name: draft.name,
        category: draft.category,
        subcategory: draft.subcategory,
        merchSubcategory: draft.merchSubcategory,
        price: draft.price,
        existingDescription: draft.description,
        tone,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || 'Failed to generate description' };
    }
    return { success: true, description: data.description };
  };

  const grokAllFilteredDescriptions = async () => {
    if (!grokEnabled) {
      setMessage('Enable Grok in Admin → Features first.');
      return;
    }
    if (filteredProducts.length === 0) {
      setMessage('No products match your filters.');
      return;
    }

    const toneLabel = PRODUCT_DESCRIPTION_TONES.find((item) => item.id === descriptionTone)?.label ?? 'TVN-style';
    const confirmed = window.confirm(
      `Write SEO descriptions for ${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'} (${bulkVisibilityLabel}) using ${toneLabel} tone?\n\nDescriptions load as drafts — review and use Save all when ready.`
    );
    if (!confirmed) return;

    setBulkGrokProgress({ current: 0, total: filteredProducts.length, name: '' });
    setMessage('');
    setDescriptionMessage('');

    let succeeded = 0;
    let failed = 0;
    let lastError = '';

    for (let index = 0; index < filteredProducts.length; index += 1) {
      const product = filteredProducts[index];
      const draft = getDraft(product);
      setBulkGrokProgress({
        current: index + 1,
        total: filteredProducts.length,
        name: draft.name,
      });

      try {
        const result = await requestGrokDescription(product, draft, descriptionTone);
        if (result.success) {
          updateDraft(product.id, 'description', result.description);
          succeeded += 1;
        } else {
          failed += 1;
          lastError = result.error;
        }
      } catch {
        failed += 1;
        lastError = 'Failed to reach Grok';
      }

      if (index < filteredProducts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    setBulkGrokProgress(null);
    if (failed === 0) {
      setMessage(
        `Grok wrote ${succeeded} description${succeeded === 1 ? '' : 's'} — review and save when ready.`
      );
    } else {
      setMessage(
        `Grok wrote ${succeeded}, failed ${failed}${lastError ? ` — last error: ${lastError}` : ''}`
      );
    }
  };

  const uploadGalleryMedia = async (product: AdminProduct, files: FileList | File[]) => {
    const mediaFiles = [...files].filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    if (mediaFiles.length === 0) {
      setMessage('Add image or video files only.');
      return;
    }

    setUploadingImageId(product.id);
    setMessage('');

    let uploaded = 0;
    let failed = 0;
    let lastError = '';

    for (const file of mediaFiles) {
      try {
        const formData = new FormData();
        formData.append('productId', product.id);
        formData.append('image', file);
        formData.append('mode', 'gallery');

        const res = await adminFetch('/api/admin/products/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          uploaded += 1;
        } else {
          failed += 1;
          lastError = data.error || 'Upload failed';
        }
      } catch {
        failed += 1;
        lastError = 'Upload failed';
      }
    }

    if (failed === 0) {
      setMessage(`Added ${uploaded} file${uploaded === 1 ? '' : 's'} to ${product.name}`);
      clearEdits(product.id);
    } else {
      setMessage(
        `Uploaded ${uploaded}, failed ${failed}${lastError ? ` — ${lastError}` : ''}`
      );
    }

    await loadProducts();
    setUploadingImageId(null);
  };

  const importProductImages = async (files: FileList | File[]) => {
    const imageFiles = [...files].filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setImportMessage('Drop image files only (JPG, PNG, WEBP, GIF).');
      return;
    }

    setImporting(true);
    setImportMessage('');
    setImportResults([]);

    try {
      const formData = new FormData();
      formData.append('category', importCategory);
      formData.append('defaultPrice', String(importPrice));
      for (const file of imageFiles) {
        formData.append('images', file);
      }

      const res = await adminFetch('/api/admin/products/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setImportMessage(data.message || 'Import complete');
        setImportResults(data.results || []);
        await loadProducts();
      } else {
        setImportMessage(data.error || 'Import failed');
      }
    } catch {
      setImportMessage('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const uploadOptionImage = async (product: AdminProduct, file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('productId', product.id);
      formData.append('image', file);
      formData.append('saveToProduct', 'false');

      const res = await adminFetch('/api/admin/products/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      return data.success ? (data.image as string) : null;
    } catch {
      return null;
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
              disabled={savingAll || bulkVisibility !== null}
              className="bg-[#00ff9d] text-black px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {savingAll ? 'Saving all...' : `Save ${dirtyIds.length} change${dirtyIds.length === 1 ? '' : 's'}`}
            </button>
          )}
          <button
            onClick={() => setBulkVisibilityForFiltered(true)}
            disabled={loading || bulkVisibility !== null || hideableCount === 0}
            className="bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {bulkVisibility === 'hide' ? 'Hiding...' : `Hide all (${hideableCount})`}
          </button>
          <button
            onClick={() => setBulkVisibilityForFiltered(false)}
            disabled={loading || bulkVisibility !== null || unhideableCount === 0}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {bulkVisibility === 'unhide' ? 'Unhiding...' : `Unhide all (${unhideableCount})`}
          </button>
          <button
            onClick={loadProducts}
            disabled={loading || bulkVisibility !== null || bulkGrokProgress !== null}
            className="bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {grokEnabled && (
            <>
              <DescriptionToneSelect value={descriptionTone} onChange={setDescriptionTone} />
              <button
                onClick={grokAllFilteredDescriptions}
                disabled={
                  loading ||
                  bulkVisibility !== null ||
                  bulkGrokProgress !== null ||
                  filteredProducts.length === 0
                }
                className="bg-[#00ff9d]/15 text-[#00ff9d] hover:bg-[#00ff9d]/25 border border-[#00ff9d]/40 px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {bulkGrokProgress
                  ? `Grok ${bulkGrokProgress.current}/${bulkGrokProgress.total}…`
                  : `✦ Grok all descriptions (${filteredProducts.length})`}
              </button>
            </>
          )}
          {message && <p className="text-sm text-[#00ff9d]">{message}</p>}
          {bulkGrokProgress && (
            <p className="text-sm text-zinc-400 w-full">
              Writing: {bulkGrokProgress.name}
            </p>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ADMIN_PRODUCT_CATEGORY_TABS.map((tab) => {
            const active = categoryTab === tab.id;
            const count = products.filter((product) => productMatchesAdminCategoryTab(product, tab.id)).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setCategoryTab(tab.id);
                  if (tab.id !== 'merch') setMerchTypeFilter('all');
                }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  active ? 'bg-[#00ff9d] text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {tab.label}
                <span className={`ml-2 text-xs ${active ? 'text-black/70' : 'text-zinc-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {(categoryTab === 'flower' || categoryTab === 'all') && (
          <ProductImportDropzone
            dragActive={importDragActive}
            importing={importing}
            category={importCategory}
            defaultPrice={importPrice}
            message={importMessage}
            results={importResults}
            categoryOptions={getAllProductCategorySlugs(siteContent.shopNavigation).map((slug) => ({
              value: slug,
              label: getProductCategoryLabel(siteContent.shopNavigation, slug),
            }))}
            onDragActiveChange={setImportDragActive}
            onCategoryChange={setImportCategory}
            onDefaultPriceChange={setImportPrice}
            onImportFiles={importProductImages}
          />
        )}

        {categoryTab === 'merch' && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setMerchTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                merchTypeFilter === 'all' ? 'bg-[#00ff9d]/20 text-[#00ff9d]' : 'bg-zinc-800 hover:bg-zinc-700'
              }`}
            >
              All merch
            </button>
            {MERCH_SUBCATEGORIES.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setMerchTypeFilter(sub.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  merchTypeFilter === sub.id ? 'bg-[#00ff9d]/20 text-[#00ff9d]' : 'bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
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
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as 'all' | 'visible' | 'hidden')}
              className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
            >
              <option value="all">All visibility</option>
              <option value="visible">Visible only</option>
              <option value="hidden">Hidden only</option>
            </select>
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
                        <span>{getProductCategoryLabel(siteContent.shopNavigation, product.category)}</span>
                        {product.category === 'merch' && draft.merchSubcategory && (
                          <span className="text-zinc-400">{getMerchSubcategoryLabel(draft.merchSubcategory)}</span>
                        )}
                        {product.category !== 'merch' && draft.subcategory && (
                          <span className="text-zinc-400">{draft.subcategory}</span>
                        )}
                        {product.hidden && <span className="text-amber-400">Hidden</span>}
                        {product.isCustom && <span className="text-sky-400">Imported</span>}
                        {product.hasOverride && <span className="text-[#00ff9d]">Edited</span>}
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
                      <AdminNumberInput
                        value={draft.price}
                        onChange={(price) => updateDraft(product.id, 'price', price)}
                        className="w-20 bg-black border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white"
                      />
                    </label>
                    {stockTracked ? (
                      <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        Stock
                        <AdminNumberInput
                          value={stock}
                          onChange={(inventory) => updateDraft(product.id, 'inventory', inventory)}
                          integer
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
              onUploadGalleryMedia={(files) => uploadGalleryMedia(selectedProduct, files)}
              onMediaChange={(media) => updateMediaDraft(selectedProduct.id, media)}
              onUploadOptionImage={(file) => uploadOptionImage(selectedProduct, file)}
              grokEnabled={grokEnabled}
              descriptionTone={descriptionTone}
              onDescriptionToneChange={setDescriptionTone}
              descriptionMessage={descriptionMessage}
              onDescriptionMessage={setDescriptionMessage}
              onRequestGrokDescription={requestGrokDescription}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DescriptionToneSelect({
  value,
  onChange,
  compact,
}: {
  value: ProductDescriptionTone;
  onChange: (tone: ProductDescriptionTone) => void;
  compact?: boolean;
}) {
  const selected = PRODUCT_DESCRIPTION_TONES.find((item) => item.id === value);

  return (
    <label className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      <span className="text-zinc-500 whitespace-nowrap">Tone</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProductDescriptionTone)}
        title={selected?.hint}
        className={`bg-black border border-zinc-700 rounded-xl text-white ${
          compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2.5 text-sm'
        }`}
      >
        {PRODUCT_DESCRIPTION_TONES.map((tone) => (
          <option key={tone.id} value={tone.id}>
            {tone.label}
          </option>
        ))}
      </select>
    </label>
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
  onUploadGalleryMedia,
  onMediaChange,
  onUploadOptionImage,
  grokEnabled,
  descriptionTone,
  onDescriptionToneChange,
  descriptionMessage,
  onDescriptionMessage,
  onRequestGrokDescription,
}: {
  product: AdminProduct;
  draft: ProductDraft;
  dirty: boolean;
  saving: boolean;
  togglingVisibility: boolean;
  uploadingImage: boolean;
  siteContent: SiteContent;
  grokEnabled: boolean;
  descriptionTone: ProductDescriptionTone;
  onDescriptionToneChange: (tone: ProductDescriptionTone) => void;
  descriptionMessage: string;
  onDescriptionMessage: Dispatch<SetStateAction<string>>;
  onRequestGrokDescription: (
    product: AdminProduct,
    draft: ProductDraft,
    tone: ProductDescriptionTone
  ) => Promise<{ success: true; description: string } | { success: false; error: string }>;
  onDraftChange: (
    field: keyof AdminProduct | 'trackInventory',
    value: string | number | boolean | ProductOptionGroup[]
  ) => void;
  onSave: () => void;
  onToggleVisibility: () => void;
  onUploadGalleryMedia: (files: FileList | File[]) => void;
  onMediaChange: (media: ProductMediaItem[]) => void;
  onUploadOptionImage: (file: File) => Promise<string | null>;
}) {
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const margin = getProductMargin(draft.price, draft.cost > 0 ? draft.cost : undefined);
  const selectedTone = PRODUCT_DESCRIPTION_TONES.find((item) => item.id === descriptionTone);
  const coverUrl = getProductCoverUrl({ image: draft.image, media: draft.media });

  const generateDescription = async () => {
    if (!grokEnabled) {
      onDescriptionMessage('Enable Grok in Admin → Features first.');
      return;
    }

    setGeneratingDescription(true);
    onDescriptionMessage('');
    try {
      const result = await onRequestGrokDescription(product, draft, descriptionTone);
      if (!result.success) {
        onDescriptionMessage(result.error);
        return;
      }
      onDraftChange('description', result.description);
      onDescriptionMessage('Grok wrote a new SEO description — review and save when ready.');
    } catch {
      onDescriptionMessage('Failed to reach Grok. Try again.');
    } finally {
      setGeneratingDescription(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-5 mb-6">
        <div className="w-28 h-28 rounded-2xl border border-zinc-700 flex-shrink-0 overflow-hidden bg-black relative">
          {draft.media.some((item) => item.url === coverUrl && item.type === 'video') ? (
            <video src={coverUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt={draft.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-bold truncate">{draft.name}</h3>
          <p className="text-xs text-zinc-500 mt-1">
            ID: {product.id} · {getProductCategoryLabel(siteContent.shopNavigation, draft.category)}
            {draft.category === 'merch' && draft.merchSubcategory && (
              <span className="ml-2">· {getMerchSubcategoryLabel(draft.merchSubcategory)}</span>
            )}
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
          <AdminNumberInput
            value={draft.price}
            onChange={(price) => onDraftChange('price', price)}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
          <p className="text-[11px] text-zinc-500 mt-1">Customer-facing shop price</p>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Cost ($)</label>
          <AdminNumberInput
            value={draft.cost}
            onChange={(cost) => onDraftChange('cost', cost)}
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
                <AdminNumberInput
                  value={draft.inventory}
                  onChange={(inventory) => onDraftChange('inventory', inventory)}
                  integer
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
                {getProductCategoryLabel(siteContent.shopNavigation, slug)}
              </option>
            ))}
          </select>
        </div>
        {draft.category === 'merch' ? (
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Merch type</label>
            <select
              value={draft.merchSubcategory}
              onChange={(e) => onDraftChange('merchSubcategory', e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
            >
              <option value="">Select type...</option>
              {MERCH_SUBCATEGORIES.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-500 mt-1">T-shirt, hoodie, hat, etc.</p>
          </div>
        ) : (
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
        )}
        <div className="md:col-span-2">
          <label className="text-xs text-zinc-500 block mb-1">Product Gallery</label>
          <p className="text-[11px] text-zinc-500 mb-3">
            Add multiple images and videos. The first image is used as the shop cover thumbnail.
          </p>
          {draft.media.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {draft.media.map((item, index) => {
                const isCover = item.url === coverUrl;
                return (
                  <div
                    key={item.url}
                    className={`relative rounded-2xl overflow-hidden border ${
                      isCover ? 'border-[#00ff9d]' : 'border-zinc-700'
                    }`}
                  >
                    <div className="relative aspect-square bg-black">
                      <ProductMediaPreview
                        item={item}
                        alt={`${draft.name} media ${index + 1}`}
                        fill
                        className="object-cover"
                        videoClassName="w-full h-full object-cover"
                      />
                      {item.type === 'video' && (
                        <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                          VIDEO
                        </span>
                      )}
                      {isCover && (
                        <span className="absolute top-2 right-2 bg-[#00ff9d] text-black text-[10px] font-bold px-2 py-1 rounded-full">
                          COVER
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 p-2 bg-zinc-950">
                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => onMediaChange(setProductCoverMedia({ image: draft.image, media: draft.media }, item.url).media)}
                          className="text-[10px] px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700"
                        >
                          Set cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onMediaChange(removeProductMedia({ image: draft.image, media: draft.media }, item.url).media)}
                        className="text-[10px] px-2 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer">
              {uploadingImage ? 'Uploading...' : 'Add images or videos'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                multiple
                className="hidden"
                disabled={uploadingImage}
                onChange={(e) => {
                  if (e.target.files?.length) {
                    onUploadGalleryMedia(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            <span className="text-xs text-zinc-500">
              Images up to 5MB · videos up to 50MB · select multiple files at once
            </span>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-zinc-500 block mb-1">Description</label>
          <textarea
            value={draft.description}
            onChange={(e) => onDraftChange('description', e.target.value)}
            rows={6}
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {grokEnabled && (
              <DescriptionToneSelect
                value={descriptionTone}
                onChange={onDescriptionToneChange}
                compact
              />
            )}
            <button
              type="button"
              onClick={generateDescription}
              disabled={generatingDescription || !grokEnabled}
              className="bg-[#00ff9d]/15 text-[#00ff9d] hover:bg-[#00ff9d]/25 border border-[#00ff9d]/40 px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generatingDescription ? 'Grok is writing...' : '✦ Write SEO description with Grok'}
            </button>
            <p className="text-xs text-zinc-500 max-w-md">
              {selectedTone?.hint ?? 'Compliant hemp copy + SEO keywords'}. Review before saving — Grok does not auto-publish.
            </p>
          </div>
          {descriptionMessage && (
            <p className="text-xs text-[#00ff9d] mt-2">{descriptionMessage}</p>
          )}
          {!grokEnabled && (
            <p className="text-xs text-amber-300 mt-2">Turn on Grok assistant in Features to use this.</p>
          )}
        </div>
        <ProductOptionsEditor
          value={draft.optionGroups}
          onChange={(groups) => onDraftChange('optionGroups', groups)}
          productCategory={draft.category}
          onUploadOptionImage={onUploadOptionImage}
        />
        <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Compare-at price ($)</label>
            <AdminNumberInput
              value={draft.compareAtPrice}
              onChange={(compareAtPrice) => onDraftChange('compareAtPrice', compareAtPrice)}
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

function ProductImportDropzone({
  dragActive,
  importing,
  category,
  defaultPrice,
  message,
  results,
  categoryOptions,
  onDragActiveChange,
  onCategoryChange,
  onDefaultPriceChange,
  onImportFiles,
}: {
  dragActive: boolean;
  importing: boolean;
  category: string;
  defaultPrice: number;
  message: string;
  results: Array<{ strain: string; status: string; message?: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
  onDragActiveChange: (active: boolean) => void;
  onCategoryChange: (category: string) => void;
  onDefaultPriceChange: (price: number) => void;
  onImportFiles: (files: FileList | File[]) => void;
}) {
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    onDragActiveChange(false);
    if (importing) return;
    if (event.dataTransfer.files.length > 0) {
      onImportFiles(event.dataTransfer.files);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-zinc-800">
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Import category</label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            disabled={importing}
            className="bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Default price ($)</label>
          <AdminNumberInput
            value={defaultPrice}
            onChange={onDefaultPriceChange}
            className="w-28 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
      </div>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          onDragActiveChange(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          onDragActiveChange(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          onDragActiveChange(false);
        }}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragActive
            ? 'border-[#00ff9d] bg-[#00ff9d]/10'
            : 'border-zinc-700 bg-black/40 hover:border-zinc-500'
        } ${importing ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <p className="text-sm font-medium mb-1">Drop product images to import</p>
        <p className="text-xs text-zinc-500 mb-4">
          Pair Hand + Bag shots per strain (e.g. &quot;WEDDING CRASHER Hand.jpg&quot; + &quot;Bag.jpg&quot;). Each strain becomes one product.
        </p>
        <label className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer">
          {importing ? 'Importing...' : 'Choose images'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              if (e.target.files?.length) {
                onImportFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />
        </label>
      </div>

      {message && <p className="text-sm text-[#00ff9d] mt-3">{message}</p>}
      {results.length > 0 && (
        <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-zinc-400 space-y-1">
          {results.map((result) => (
            <li key={result.strain}>
              <span
                className={
                  result.status === 'created'
                    ? 'text-[#00ff9d]'
                    : result.status === 'skipped'
                      ? 'text-amber-300'
                      : 'text-red-400'
                }
              >
                {result.strain}
              </span>
              {result.message ? ` — ${result.message}` : ` — ${result.status}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}