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
  getSubsectionLabel,
  getSubsectionsForProductCategory,
  mergeShopNavigation,
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
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const grokEnabled = siteContent.features.grokAssistant.enabled;
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId]
  );
  const selectedDirty = selectedId ? !!edits[selectedId] : false;

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
          shopNavigation: mergeShopNavigation(data.content?.shopNavigation),
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
        image: draft.image || getProductCoverUrl({ image: draft.image, media: draft.media }),
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
    const flowerCount = filteredProducts.filter((p) => getDraft(p).category === 'flower').length;
    const strainNote =
      flowerCount > 0
        ? `\n\n${flowerCount} flower product${flowerCount === 1 ? '' : 's'} will include strain research from photos + public databases.`
        : '';
    const confirmed = window.confirm(
      `Write SEO descriptions for ${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'} (${bulkVisibilityLabel}) using ${toneLabel} tone?${strainNote}\n\nDescriptions load as drafts — review and use Save all when ready.`
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

  const createSubsection = async (productCategory: string, label: string, productId: string) => {
    const trimmed = label.trim();
    if (!trimmed) {
      setMessage('Enter a sub-section name.');
      return null;
    }

    try {
      const res = await adminFetch('/api/admin/products/subsections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCategory, label: trimmed }),
      });
      const data = await res.json();
      if (!data.success) {
        setMessage(data.error || 'Failed to create sub-section');
        return null;
      }

      setSiteContent((prev) => ({
        ...prev,
        shopNavigation: mergeShopNavigation(data.shopNavigation),
      }));
      updateDraft(productId, 'subcategory', data.subsection.id);
      setMessage(data.message || `Sub-section "${data.subsection.label}" ready`);
      return data.subsection.id as string;
    } catch {
      setMessage('Failed to create sub-section');
      return null;
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (selectedProduct && edits[selectedProduct.id]) {
          void saveProduct(selectedProduct);
        } else if (dirtyIds.length > 0) {
          void saveAllDirty();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedProduct, edits, dirtyIds.length]);

  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold">Products</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pick a product · edit in tabs · press Ctrl+S to save
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirtyIds.length > 0 && (
            <button
              onClick={saveAllDirty}
              disabled={savingAll || bulkVisibility !== null}
              className="bg-[#00ff9d] text-black px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {savingAll ? 'Saving...' : `Save all (${dirtyIds.length})`}
            </button>
          )}
          <button
            onClick={loadProducts}
            disabled={loading || bulkVisibility !== null || bulkGrokProgress !== null}
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? '...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => setShowBulkActions((open) => !open)}
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-medium"
          >
            {showBulkActions ? 'Less' : 'Bulk actions'}
          </button>
        </div>
      </div>

      {message && (
        <p className="text-sm text-[#00ff9d] mb-3 px-1">{message}</p>
      )}

      {showBulkActions && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-zinc-800 bg-zinc-950/80">
          <button
            onClick={() => setBulkVisibilityForFiltered(true)}
            disabled={loading || bulkVisibility !== null || hideableCount === 0}
            className="bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
          >
            {bulkVisibility === 'hide' ? 'Hiding...' : `Hide all (${hideableCount})`}
          </button>
          <button
            onClick={() => setBulkVisibilityForFiltered(false)}
            disabled={loading || bulkVisibility !== null || unhideableCount === 0}
            className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
          >
            {bulkVisibility === 'unhide' ? 'Unhiding...' : `Unhide all (${unhideableCount})`}
          </button>
          {grokEnabled && (
            <>
              <DescriptionToneSelect value={descriptionTone} onChange={setDescriptionTone} compact />
              <button
                onClick={grokAllFilteredDescriptions}
                disabled={
                  loading ||
                  bulkVisibility !== null ||
                  bulkGrokProgress !== null ||
                  filteredProducts.length === 0
                }
                className="bg-[#00ff9d]/15 text-[#00ff9d] hover:bg-[#00ff9d]/25 border border-[#00ff9d]/40 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
              >
                {bulkGrokProgress
                  ? `Grok ${bulkGrokProgress.current}/${bulkGrokProgress.total}…`
                  : `Grok descriptions (${filteredProducts.length})`}
              </button>
            </>
          )}
          {bulkGrokProgress && (
            <span className="text-xs text-zinc-500">Writing: {bulkGrokProgress.name}</span>
          )}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-3 mb-3">
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
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowImportPanel((open) => !open)}
              className="text-xs font-medium text-zinc-400 hover:text-white"
            >
              {showImportPanel ? '▾ Hide image import' : '▸ Import products from images'}
            </button>
            {showImportPanel && (
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
          </div>
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

      <div className="grid lg:grid-cols-[minmax(260px,300px)_1fr] gap-4 h-[calc(100vh-11rem)] min-h-[520px]">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-3 flex flex-col min-h-0">
          <div className="flex gap-2 mb-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as 'all' | 'visible' | 'hidden')}
              className="bg-black border border-zinc-700 rounded-lg px-2 py-2 text-xs max-w-[7rem]"
              title="Visibility filter"
            >
              <option value="all">All</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <p className="text-[11px] text-zinc-500 mb-2 px-0.5">
            {loading ? 'Loading...' : `${filteredProducts.length} products`}
            {dirtyIds.length > 0 && <span className="text-amber-300 ml-1">· {dirtyIds.length} unsaved</span>}
          </p>

          <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
            {filteredProducts.map((product) => {
              const draft = getDraft(product);
              const dirty = !!edits[product.id];
              const active = product.id === selectedId;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedId(product.id)}
                  className={`w-full text-left rounded-xl border px-2.5 py-2 flex items-center gap-2.5 transition ${
                    active
                      ? 'border-[#00ff9d] bg-[#00ff9d]/10'
                      : product.hidden
                        ? 'border-zinc-800/80 bg-black/20 opacity-75 hover:border-zinc-600'
                        : 'border-transparent bg-black/30 hover:border-zinc-700 hover:bg-black/50'
                  }`}
                >
                  <img
                    src={draft.image}
                    alt=""
                    className="w-10 h-10 object-cover rounded-lg border border-zinc-700 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{draft.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      ${draft.price}
                      {product.hidden && <span className="text-amber-400 ml-1">· Hidden</span>}
                    </p>
                  </div>
                  {dirty && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Unsaved changes" />
                  )}
                </button>
              );
            })}
            {!loading && filteredProducts.length === 0 && (
              <p className="text-center text-zinc-500 text-sm py-10">No matches</p>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl min-h-0 flex flex-col overflow-hidden">
          {!selectedProduct ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Select a product to edit
            </div>
          ) : (
            <ProductDetailPanel
              product={selectedProduct}
              draft={getDraft(selectedProduct)}
              dirty={selectedDirty}
              saving={savingId === selectedProduct.id}
              togglingVisibility={togglingVisibilityId === selectedProduct.id}
              uploadingImage={uploadingImageId === selectedProduct.id}
              siteContent={siteContent}
              onDraftChange={(field, value) => updateDraft(selectedProduct.id, field, value)}
              onSave={() => saveProduct(selectedProduct)}
              onDiscard={() => clearEdits(selectedProduct.id)}
              onToggleVisibility={() => toggleVisibility(selectedProduct)}
              onUploadGalleryMedia={(files) => uploadGalleryMedia(selectedProduct, files)}
              onMediaChange={(media) => updateMediaDraft(selectedProduct.id, media)}
              onCreateSubsection={(label) => createSubsection(selectedProduct.category, label, selectedProduct.id)}
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

type EditorTab = 'basics' | 'media' | 'description' | 'more';

const EDITOR_TABS: Array<{ id: EditorTab; label: string }> = [
  { id: 'basics', label: 'Basics' },
  { id: 'media', label: 'Photos' },
  { id: 'description', label: 'Description' },
  { id: 'more', label: 'Stock & more' },
];

const fieldClass = 'w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm';
const labelClass = 'text-[11px] text-zinc-500 block mb-1';

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
  onDiscard,
  onToggleVisibility,
  onUploadGalleryMedia,
  onMediaChange,
  onCreateSubsection,
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
  onDiscard: () => void;
  onToggleVisibility: () => void;
  onUploadGalleryMedia: (files: FileList | File[]) => void;
  onMediaChange: (media: ProductMediaItem[]) => void;
  onCreateSubsection: (label: string) => Promise<string | null>;
  onUploadOptionImage: (file: File) => Promise<string | null>;
}) {
  const [editorTab, setEditorTab] = useState<EditorTab>('basics');
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [creatingSubsection, setCreatingSubsection] = useState(false);
  const [newSubsectionName, setNewSubsectionName] = useState('');
  const [showNewSubsection, setShowNewSubsection] = useState(false);
  const margin = getProductMargin(draft.price, draft.cost > 0 ? draft.cost : undefined);
  const selectedTone = PRODUCT_DESCRIPTION_TONES.find((item) => item.id === descriptionTone);
  const coverUrl = getProductCoverUrl({ image: draft.image, media: draft.media });

  useEffect(() => {
    setEditorTab('basics');
    setShowNewSubsection(false);
    setNewSubsectionName('');
  }, [product.id]);

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
      onDescriptionMessage('Description ready — click Save.');
      setEditorTab('description');
    } catch {
      onDescriptionMessage('Failed to reach Grok. Try again.');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const subcategoryField =
    draft.category === 'merch' ? (
      <div>
        <label className={labelClass}>Merch type</label>
        <select
          value={draft.merchSubcategory}
          onChange={(e) => onDraftChange('merchSubcategory', e.target.value)}
          className={fieldClass}
        >
          <option value="">Select type...</option>
          {MERCH_SUBCATEGORIES.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.label}
            </option>
          ))}
        </select>
      </div>
    ) : (
      <div>
        <label className={labelClass}>Sub-section</label>
        <select
          value={draft.subcategory}
          onChange={(e) => {
            if (e.target.value === '__create__') {
              setShowNewSubsection(true);
              return;
            }
            onDraftChange('subcategory', e.target.value);
          }}
          className={fieldClass}
        >
          <option value="">None</option>
          {getSubsectionsForProductCategory(siteContent.shopNavigation, draft.category).map((subsection) => (
            <option key={subsection.id} value={subsection.id}>
              {subsection.label}
            </option>
          ))}
          <option value="__create__">+ New sub-section...</option>
        </select>
        {showNewSubsection && (
          <div className="mt-2 flex gap-2">
            <input
              value={newSubsectionName}
              onChange={(e) => setNewSubsectionName(e.target.value)}
              placeholder="e.g. Indoor, Smalls"
              className={`${fieldClass} flex-1`}
            />
            <button
              type="button"
              disabled={creatingSubsection || !newSubsectionName.trim()}
              onClick={async () => {
                setCreatingSubsection(true);
                const id = await onCreateSubsection(newSubsectionName);
                if (id) {
                  setNewSubsectionName('');
                  setShowNewSubsection(false);
                }
                setCreatingSubsection(false);
              }}
              className="bg-[#00ff9d] text-black px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 whitespace-nowrap"
            >
              {creatingSubsection ? '...' : 'Add'}
            </button>
          </div>
        )}
      </div>
    );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800 flex items-center gap-3 bg-zinc-900/95">
        <div className="w-11 h-11 rounded-lg border border-zinc-700 overflow-hidden bg-black flex-shrink-0">
          {draft.media.some((item) => item.url === coverUrl && item.type === 'video') ? (
            <video src={coverUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{draft.name}</p>
          <p className="text-[11px] text-zinc-500 truncate">
            ${draft.price} · {getProductCategoryLabel(siteContent.shopNavigation, draft.category)}
            {product.hidden && <span className="text-amber-400 ml-1">· Hidden</span>}
          </p>
        </div>
        {dirty && <span className="text-[10px] text-amber-300 font-medium">Unsaved</span>}
        <button
          type="button"
          onClick={onDiscard}
          disabled={!dirty || saving}
          className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={togglingVisibility}
          className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
        >
          {togglingVisibility ? '...' : product.hidden ? 'Unhide' : 'Hide'}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="text-sm px-4 py-1.5 rounded-lg bg-[#00ff9d] text-black font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex-shrink-0 px-4 pt-3">
        <div className="flex gap-1 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
          {EDITOR_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEditorTab(tab.id)}
              className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition ${
                editorTab === tab.id
                  ? 'bg-[#00ff9d] text-black'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {editorTab === 'basics' && (
          <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
            <div className="sm:col-span-2">
              <label className={labelClass}>Name</label>
              <input
                value={draft.name}
                onChange={(e) => onDraftChange('name', e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Sell price ($)</label>
              <AdminNumberInput
                value={draft.price}
                onChange={(price) => onDraftChange('price', price)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cost ($)</label>
              <AdminNumberInput
                value={draft.cost}
                onChange={(cost) => onDraftChange('cost', cost)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Compare-at price ($)</label>
              <AdminNumberInput
                value={draft.compareAtPrice}
                onChange={(compareAtPrice) => onDraftChange('compareAtPrice', compareAtPrice)}
                className={fieldClass}
              />
            </div>
            {margin && (
              <div className="flex items-center text-xs text-zinc-500 px-1">
                Margin {formatCurrency(margin.profit)} · {formatPercent(margin.marginPercent)}
              </div>
            )}
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={draft.category}
                onChange={(e) => onDraftChange('category', e.target.value)}
                className={fieldClass}
              >
                {getAllProductCategorySlugs(siteContent.shopNavigation).map((slug) => (
                  <option key={slug} value={slug}>
                    {getProductCategoryLabel(siteContent.shopNavigation, slug)}
                  </option>
                ))}
              </select>
            </div>
            {subcategoryField}
          </div>
        )}

        {editorTab === 'media' && (
          <div className="max-w-2xl">
            <p className="text-[11px] text-zinc-500 mb-3">First image = shop thumbnail. Uploads save immediately.</p>
            {draft.media.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {draft.media.map((item, index) => {
                  const isCover = item.url === coverUrl;
                  return (
                    <div
                      key={item.url}
                      className={`rounded-lg overflow-hidden border ${isCover ? 'border-[#00ff9d]' : 'border-zinc-700'}`}
                    >
                      <div className="relative aspect-square bg-black">
                        <ProductMediaPreview
                          item={item}
                          alt={`${draft.name} ${index + 1}`}
                          fill
                          className="object-cover"
                          videoClassName="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-1 p-1.5 bg-zinc-950">
                        {!isCover && (
                          <button
                            type="button"
                            onClick={() =>
                              onMediaChange(
                                setProductCoverMedia({ image: draft.image, media: draft.media }, item.url).media
                              )
                            }
                            className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800"
                          >
                            Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onMediaChange(removeProductMedia({ image: draft.image, media: draft.media }, item.url).media)
                          }
                          className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 ml-auto"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <label className="inline-flex bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
              {uploadingImage ? 'Uploading...' : '+ Add photos or video'}
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
          </div>
        )}

        {editorTab === 'description' && (
          <div className="max-w-2xl space-y-3">
            <textarea
              value={draft.description}
              onChange={(e) => onDraftChange('description', e.target.value)}
              rows={10}
              placeholder="Product description for the shop page..."
              className={`${fieldClass} resize-y min-h-[200px]`}
            />
            {grokEnabled && (
              <div className="flex flex-wrap items-center gap-2">
                <DescriptionToneSelect value={descriptionTone} onChange={onDescriptionToneChange} compact />
                <button
                  type="button"
                  onClick={generateDescription}
                  disabled={generatingDescription}
                  className="bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/40 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                >
                  {generatingDescription
                    ? 'Researching strain...'
                    : draft.category === 'flower'
                      ? '✦ Grok write (strain + SEO)'
                      : '✦ Grok write'}
                </button>
              </div>
            )}
            {grokEnabled && draft.category === 'flower' && (
              <p className="text-xs text-zinc-500">
                Flower products: Grok analyzes your photos and cross-references public strain data for lineage, aroma, and visual details.
              </p>
            )}
            {descriptionMessage && <p className="text-xs text-[#00ff9d]">{descriptionMessage}</p>}
            {!grokEnabled && (
              <p className="text-xs text-zinc-500">Enable Grok in Features for AI descriptions.</p>
            )}
          </div>
        )}

        {editorTab === 'more' && (
          <div className="space-y-4 max-w-3xl">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.trackInventory}
                  onChange={(e) => onDraftChange('trackInventory', e.target.checked)}
                  className="w-4 h-4 accent-[#00ff9d]"
                />
                Track inventory
              </label>
              {draft.trackInventory && (
                <div className="mt-3 flex items-center gap-3">
                  <label className={labelClass}>Stock</label>
                  <AdminNumberInput
                    value={draft.inventory}
                    onChange={(inventory) => onDraftChange('inventory', inventory)}
                    integer
                    className="w-24 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  />
                  {draft.inventory <= 5 && (
                    <span className={`text-xs ${draft.inventory === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {draft.inventory === 0 ? 'Out of stock' : 'Low stock'}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => onDraftChange('featured', e.target.checked)}
                  className="w-4 h-4 accent-[#00ff9d]"
                />
                Featured
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.bestSeller}
                  onChange={(e) => onDraftChange('bestSeller', e.target.checked)}
                  className="w-4 h-4 accent-[#00ff9d]"
                />
                Best seller
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.isNew}
                  onChange={(e) => onDraftChange('isNew', e.target.checked)}
                  className="w-4 h-4 accent-[#00ff9d]"
                />
                New arrival
              </label>
            </div>
            <ProductOptionsEditor
              value={draft.optionGroups}
              onChange={(groups) => onDraftChange('optionGroups', groups)}
              productCategory={draft.category}
              onUploadOptionImage={onUploadOptionImage}
            />
          </div>
        )}
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