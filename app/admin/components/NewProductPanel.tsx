'use client';

import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { adminFetch } from '@/lib/adminClient';
import AdminNumberInput from '@/app/admin/components/AdminNumberInput';
import ProductOptionsEditor from '@/app/admin/components/ProductOptionsEditor';
import { MERCH_SUBCATEGORIES } from '@/lib/merch';
import {
  getAllProductCategorySlugs,
  getProductCategoryLabel,
  getSubsectionsForProductCategory,
  type AdminProductCategoryTabId,
} from '@/lib/shopNavigation';
import type { SiteContent } from '@/lib/siteContentTypes';
import type { ProductOptionGroup } from '@/lib/productOptions';
import { getProductMedia, syncProductMediaFields } from '@/lib/productMedia';

const fieldClass = 'w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm';
const labelClass = 'text-[11px] text-zinc-500 block mb-1';

function defaultCategoryForTab(tab: AdminProductCategoryTabId): string {
  if (tab === 'vaporizers') return 'vapes';
  if (tab === 'all') return 'flower';
  if (tab === 'merch') return 'merch';
  return tab;
}

function defaultPriceForCategory(category: string): number {
  switch (category) {
    case 'flower':
    case 'moonrocks':
      return 700;
    case 'concentrates':
      return 800;
    case 'merch':
      return 20;
    case 'vapes':
      return 15;
    case 'mushrooms':
      return 4;
    default:
      return 50;
  }
}

export default function NewProductPanel({
  siteContent,
  categoryTab,
  onCancel,
  onCreated,
}: {
  siteContent: SiteContent;
  categoryTab: AdminProductCategoryTabId;
  onCancel: () => void;
  onCreated: (productId: string) => void;
}) {
  const initialCategory = defaultCategoryForTab(categoryTab);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [price, setPrice] = useState(defaultPriceForCategory(initialCategory));
  const [cost, setCost] = useState(0);
  const [compareAtPrice, setCompareAtPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [merchSubcategory, setMerchSubcategory] = useState('');
  const [featured, setFeatured] = useState(false);
  const [bestSeller, setBestSeller] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const previewUrls = useMemo(
    () => pendingFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [pendingFiles]
  );

  useEffect(() => {
    return () => {
      for (const preview of previewUrls) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [previewUrls]);

  const addFiles = (files: FileList | File[]) => {
    const mediaFiles = [...files].filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    if (mediaFiles.length === 0) {
      setError('Add JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV files only.');
      return;
    }
    setError('');
    setPendingFiles((prev) => [...prev, ...mediaFiles]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadGalleryMedia = async (productId: string, files: File[]) => {
    let workingMedia = syncProductMediaFields([]).media;
    let uploaded = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('image', file);
      formData.append('mode', 'gallery');
      formData.append('currentMedia', JSON.stringify(workingMedia));

      const res = await adminFetch('/api/admin/products/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Image upload failed');
      }
      uploaded += 1;
      if (data.product) {
        workingMedia = getProductMedia(data.product);
      } else if (Array.isArray(data.media)) {
        workingMedia = data.media;
      }
    }

    return uploaded;
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter a product name.');
      return;
    }

    setCreating(true);
    setError('');
    setStatus('Creating product...');

    try {
      const res = await adminFetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          price,
          cost: cost > 0 ? cost : undefined,
          compareAtPrice: compareAtPrice > 0 ? compareAtPrice : undefined,
          description,
          category,
          subcategory: category === 'merch' ? undefined : subcategory || undefined,
          merchSubcategory: category === 'merch' ? merchSubcategory || undefined : undefined,
          featured,
          bestSeller,
          isNew,
          optionGroups,
        }),
      });
      const data = await res.json();
      if (!data.success || !data.product?.id) {
        setError(data.error || 'Failed to create product');
        setStatus('');
        return;
      }

      const productId = data.product.id as string;

      if (pendingFiles.length > 0) {
        setStatus(`Uploading ${pendingFiles.length} file${pendingFiles.length === 1 ? '' : 's'}...`);
        const uploaded = await uploadGalleryMedia(productId, pendingFiles);
        setStatus(`Created ${trimmedName} with ${uploaded} photo${uploaded === 1 ? '' : 's'}.`);
      } else {
        setStatus(`Created ${trimmedName}. Add photos in the editor.`);
      }

      onCreated(productId);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to create product');
      setStatus('');
    } finally {
      setCreating(false);
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    if (creating || event.dataTransfer.files.length === 0) return;
    addFiles(event.dataTransfer.files);
  };

  const categoryOptions = getAllProductCategorySlugs(siteContent.shopNavigation).map((slug) => ({
    value: slug,
    label: getProductCategoryLabel(siteContent.shopNavigation, slug),
  }));

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900/95">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-base">New product</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Add name, photos, price, and category — then create in one step.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={creating}
              className="text-xs px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="text-sm px-4 py-2 rounded-lg bg-[#00ff9d] text-black font-semibold disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create product'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 space-y-4 max-w-3xl">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {status && !error && (
          <div className="rounded-lg border border-[#00ff9d]/30 bg-[#00ff9d]/10 px-3 py-2 text-sm text-[#00ff9d]">
            {status}
          </div>
        )}

        <div>
          <label className={labelClass}>Photos & video</label>
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
              dragActive
                ? 'border-[#00ff9d] bg-[#00ff9d]/10'
                : 'border-zinc-700 bg-black/40 hover:border-zinc-500'
            } ${creating ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <p className="text-sm text-zinc-300 mb-1">Drop images here or browse</p>
            <p className="text-xs text-zinc-500 mb-3">First image becomes the shop thumbnail</p>
            <label className="inline-flex bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
              Choose files
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                multiple
                className="hidden"
                disabled={creating}
                onChange={(e) => {
                  if (e.target.files?.length) {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>

          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
              {previewUrls.map((preview, index) => (
                <div key={`${preview.file.name}-${index}`} className="relative rounded-lg overflow-hidden border border-zinc-700">
                  {preview.file.type.startsWith('video/') ? (
                    <video src={preview.url} className="aspect-square w-full object-cover bg-black" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview.url} alt="" className="aspect-square w-full object-cover bg-black" />
                  )}
                  {index === 0 && (
                    <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-[#00ff9d] text-black font-medium">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => removePendingFile(index)}
                    className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-red-500/80 text-white disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>Product name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BL3 Junkie, Kush World Hoodie"
              className={fieldClass}
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Category *</label>
            <select
              value={category}
              onChange={(e) => {
                const next = e.target.value;
                setCategory(next);
                setPrice(defaultPriceForCategory(next));
                if (next === 'merch') setSubcategory('');
                else setMerchSubcategory('');
              }}
              className={fieldClass}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Sell price ($) *</label>
            <AdminNumberInput value={price} onChange={setPrice} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Cost ($)</label>
            <AdminNumberInput value={cost} onChange={setCost} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Compare-at price ($)</label>
            <AdminNumberInput value={compareAtPrice} onChange={setCompareAtPrice} className={fieldClass} />
          </div>
          {category === 'merch' ? (
            <div>
              <label className={labelClass}>Merch type</label>
              <select
                value={merchSubcategory}
                onChange={(e) => setMerchSubcategory(e.target.value)}
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
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className={fieldClass}
              >
                <option value="">None</option>
                {getSubsectionsForProductCategory(siteContent.shopNavigation, category).map((subsection) => (
                  <option key={subsection.id} value={subsection.id}>
                    {subsection.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            placeholder="Product details for the shop page. You can refine this after creating."
            className={`${fieldClass} resize-y min-h-[140px]`}
          />
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 accent-[#00ff9d]"
            />
            Featured
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bestSeller}
              onChange={(e) => setBestSeller(e.target.checked)}
              className="w-4 h-4 accent-[#00ff9d]"
            />
            Best seller
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isNew}
              onChange={(e) => setIsNew(e.target.checked)}
              className="w-4 h-4 accent-[#00ff9d]"
            />
            New arrival
          </label>
        </div>

        <ProductOptionsEditor
          value={optionGroups}
          onChange={setOptionGroups}
          productCategory={category}
        />
      </div>
    </div>
  );
}