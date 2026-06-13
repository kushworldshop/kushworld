'use client';

import { useState } from 'react';
import AdminNumberInput from '@/app/admin/components/AdminNumberInput';
import type { ProductOptionGroup, ProductOptionValue } from '@/lib/productOptions';
import {
  DEVICE_OPTION_GROUP_PRESETS,
  importOptionValuesIntoGroup,
  isDeviceStyleProductCategory,
  MAX_PRODUCT_OPTION_GROUPS,
  MAX_PRODUCT_OPTION_VALUES_PER_GROUP,
  serializeOptionGroupValues,
} from '@/lib/productOptions';

interface ProductOptionsEditorProps {
  value: ProductOptionGroup[];
  onChange: (groups: ProductOptionGroup[]) => void;
  productCategory?: string;
  onUploadOptionImage?: (file: File) => Promise<string | null>;
}

function emptyGroup(name = ''): ProductOptionGroup {
  return { name, values: [{ label: '', priceAdjustment: undefined }] };
}

function emptyValue(): ProductOptionValue {
  return { label: '', priceAdjustment: undefined };
}

function normalizeGroups(groups: ProductOptionGroup[]): ProductOptionGroup[] {
  return groups
    .map((group) => ({
      name: group.name,
      values: group.values.length > 0 ? group.values : [emptyValue()],
    }))
    .filter((group) => group.name.trim() || group.values.some((value) => value.label.trim()));
}

export default function ProductOptionsEditor({
  value,
  onChange,
  productCategory,
  onUploadOptionImage,
}: ProductOptionsEditorProps) {
  const groups = normalizeGroups(value.length > 0 ? value : []);
  const isDeviceProduct = isDeviceStyleProductCategory(productCategory);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bulkOpenFor, setBulkOpenFor] = useState<number | null>(null);
  const [bulkText, setBulkText] = useState<Record<number, string>>({});
  const [bulkMode, setBulkMode] = useState<Record<number, 'append' | 'replace'>>({});
  const [importMessage, setImportMessage] = useState<Record<number, string>>({});
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const commitGroups = (next: ProductOptionGroup[]) => {
    const cleaned = next
      .map((group) => ({
        name: group.name.trim(),
        values: group.values
          .map((item) => ({
            label: item.label.trim(),
            priceAdjustment:
              item.priceAdjustment !== undefined &&
              item.priceAdjustment !== null &&
              !Number.isNaN(Number(item.priceAdjustment))
                ? Number(item.priceAdjustment)
                : undefined,
            sku: item.sku?.trim() || undefined,
            image: item.image?.trim() || undefined,
          }))
          .filter(
            (item) =>
              item.label ||
              item.priceAdjustment !== undefined ||
              item.sku ||
              item.image
          )
          .slice(0, MAX_PRODUCT_OPTION_VALUES_PER_GROUP),
      }))
      .filter((group) => group.name || group.values.length > 0);
    onChange(cleaned);
  };

  const updateGroup = (index: number, next: ProductOptionGroup) => {
    const updated = [...groups];
    updated[index] = next;
    commitGroups(updated);
  };

  const removeGroup = (index: number) => {
    commitGroups(groups.filter((_, i) => i !== index));
    setLimitMessage(null);
  };

  const addGroup = (presetName?: string) => {
    if (groups.length >= MAX_PRODUCT_OPTION_GROUPS) {
      setLimitMessage(`Maximum ${MAX_PRODUCT_OPTION_GROUPS} option groups per product.`);
      return;
    }
    setLimitMessage(null);
    commitGroups([...groups, emptyGroup(presetName ?? '')]);
  };

  const updateValue = (groupIndex: number, valueIndex: number, patch: Partial<ProductOptionValue>) => {
    const group = groups[groupIndex];
    const values = [...group.values];
    values[valueIndex] = { ...values[valueIndex], ...patch };
    updateGroup(groupIndex, { ...group, values });
  };

  const addValue = (groupIndex: number) => {
    const group = groups[groupIndex];
    if (group.values.length >= MAX_PRODUCT_OPTION_VALUES_PER_GROUP) {
      setLimitMessage(
        `This group is full (${MAX_PRODUCT_OPTION_VALUES_PER_GROUP}/${MAX_PRODUCT_OPTION_VALUES_PER_GROUP}). Remove an option first.`
      );
      return;
    }
    setLimitMessage(null);
    updateGroup(groupIndex, { ...group, values: [...group.values, emptyValue()] });
  };

  const removeValue = (groupIndex: number, valueIndex: number) => {
    const group = groups[groupIndex];
    const values = group.values.filter((_, i) => i !== valueIndex);
    updateGroup(groupIndex, {
      ...group,
      values: values.length > 0 ? values : [emptyValue()],
    });
    setLimitMessage(null);
  };

  const runBulkImport = (groupIndex: number) => {
    const group = groups[groupIndex];
    const text = bulkText[groupIndex] ?? '';
    const mode = bulkMode[groupIndex] ?? 'append';
    const result = importOptionValuesIntoGroup(group.values, text, mode);
    updateGroup(groupIndex, { ...group, values: result.values });

    const parts: string[] = [];
    if (result.imported > 0) parts.push(`Imported ${result.imported}`);
    if (result.duplicateSkipped > 0) parts.push(`${result.duplicateSkipped} duplicate${result.duplicateSkipped === 1 ? '' : 's'} skipped`);
    if (result.truncated > 0) {
      parts.push(`${result.truncated} skipped (max ${MAX_PRODUCT_OPTION_VALUES_PER_GROUP} per group)`);
    }
    setImportMessage({
      ...importMessage,
      [groupIndex]: parts.length > 0 ? parts.join(' · ') : 'No valid lines found',
    });
  };

  const uploadOptionImage = async (groupIndex: number, valueIndex: number, file: File) => {
    if (!onUploadOptionImage) return;
    const key = `${groupIndex}-${valueIndex}`;
    setUploadingFor(key);
    try {
      const image = await onUploadOptionImage(file);
      if (image) updateValue(groupIndex, valueIndex, { image });
    } finally {
      setUploadingFor(null);
    }
  };

  return (
    <div className="md:col-span-2 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Product options</p>
          <p className="text-xs text-zinc-500 max-w-xl">
            {isDeviceProduct
              ? `Add up to ${MAX_PRODUCT_OPTION_VALUES_PER_GROUP} choices per group for device models, colors, or kits. Customers pick one before adding to cart.`
              : `Add option groups like Size, Strain, or Flavor — up to ${MAX_PRODUCT_OPTION_VALUES_PER_GROUP} choices each.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showAdvanced}
              onChange={(e) => setShowAdvanced(e.target.checked)}
              className="rounded"
            />
            SKU &amp; images
          </label>
          <button
            type="button"
            onClick={() => addGroup()}
            disabled={groups.length >= MAX_PRODUCT_OPTION_GROUPS}
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
            title={
              groups.length >= MAX_PRODUCT_OPTION_GROUPS
                ? `Maximum ${MAX_PRODUCT_OPTION_GROUPS} groups`
                : undefined
            }
          >
            + Add option group
          </button>
        </div>
      </div>

      {limitMessage && (
        <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-3">
          {limitMessage}
        </p>
      )}

      {isDeviceProduct && groups.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {DEVICE_OPTION_GROUP_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => addGroup(preset.name)}
              className="text-xs bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 px-3 py-1.5 rounded-lg hover:bg-[#00ff9d]/20"
            >
              + {preset.name} options
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 && (
        <p className="text-xs text-zinc-500 border border-dashed border-zinc-700 rounded-xl p-4">
          No custom options yet. Legacy size/color fields still work until you save option groups here.
        </p>
      )}

      {groups.map((group, groupIndex) => {
        const filledCount = group.values.filter((item) => item.label.trim()).length;
        const atLimit = group.values.length >= MAX_PRODUCT_OPTION_VALUES_PER_GROUP;
        const bulkOpen = bulkOpenFor === groupIndex;

        return (
          <div key={groupIndex} className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <input
                value={group.name}
                onChange={(e) => updateGroup(groupIndex, { ...group, name: e.target.value })}
                placeholder="Option group (e.g. Model, Color, Strain)"
                className="flex-1 min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3"
              />
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs ${atLimit ? 'text-amber-400 font-medium' : 'text-zinc-500'}`}
                  title={atLimit ? `Maximum ${MAX_PRODUCT_OPTION_VALUES_PER_GROUP} options per group` : undefined}
                >
                  {filledCount}/{MAX_PRODUCT_OPTION_VALUES_PER_GROUP}
                  {atLimit ? ' · full' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setBulkOpenFor(bulkOpen ? null : groupIndex)}
                  className="text-xs text-zinc-400 hover:text-[#00ff9d] px-2 py-2"
                >
                  {bulkOpen ? 'Hide bulk import' : 'Bulk import'}
                </button>
                <button
                  type="button"
                  onClick={() => removeGroup(groupIndex)}
                  className="text-red-400 hover:text-red-300 text-sm px-3 py-2"
                >
                  Remove group
                </button>
              </div>
            </div>

            {bulkOpen && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
                <p className="text-xs text-zinc-500">
                  One option per line. Examples:{' '}
                  <span className="text-zinc-400">Blue</span>,{' '}
                  <span className="text-zinc-400">Black (+$5)</span>,{' '}
                  <span className="text-zinc-400">Silver [SKU-123]</span>,{' '}
                  <span className="text-zinc-400">Rose Gold (+$3) | POD-2G</span>
                </p>
                <textarea
                  value={bulkText[groupIndex] ?? serializeOptionGroupValues(group.values.filter((v) => v.label.trim()))}
                  onChange={(e) => setBulkText({ ...bulkText, [groupIndex]: e.target.value })}
                  rows={6}
                  placeholder={'Blue\nBlack (+$5)\nSilver [SKU-123]'}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="radio"
                      name={`bulk-mode-${groupIndex}`}
                      checked={(bulkMode[groupIndex] ?? 'append') === 'append'}
                      onChange={() => setBulkMode({ ...bulkMode, [groupIndex]: 'append' })}
                    />
                    Append
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="radio"
                      name={`bulk-mode-${groupIndex}`}
                      checked={bulkMode[groupIndex] === 'replace'}
                      onChange={() => setBulkMode({ ...bulkMode, [groupIndex]: 'replace' })}
                    />
                    Replace all
                  </label>
                  <button
                    type="button"
                    onClick={() => runBulkImport(groupIndex)}
                    className="text-sm bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30 px-3 py-1.5 rounded-lg hover:bg-[#00ff9d]/25"
                  >
                    Import lines
                  </button>
                </div>
                {importMessage[groupIndex] && (
                  <p className="text-xs text-[#00ff9d]">{importMessage[groupIndex]}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              {group.values.map((option, valueIndex) => (
                <div key={valueIndex} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {showAdvanced && option.image && (
                      <img
                        src={option.image}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-zinc-700 flex-shrink-0"
                      />
                    )}
                    <input
                      value={option.label}
                      onChange={(e) => updateValue(groupIndex, valueIndex, { label: e.target.value })}
                      placeholder={
                        isDeviceProduct
                          ? `Choice ${valueIndex + 1} (e.g. Blue Device)`
                          : `Choice ${valueIndex + 1}`
                      }
                      className="flex-1 min-w-[180px] bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs text-zinc-500">
                      +$
                      <AdminNumberInput
                        optional
                        value={option.priceAdjustment}
                        onChange={(priceAdjustment) =>
                          updateValue(groupIndex, valueIndex, { priceAdjustment })
                        }
                        placeholder="0"
                        className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeValue(groupIndex, valueIndex)}
                      className="text-zinc-500 hover:text-red-400 px-2 py-2 text-sm"
                      title="Remove option"
                    >
                      ✕
                    </button>
                  </div>

                  {showAdvanced && (
                    <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-10">
                      <input
                        value={option.sku ?? ''}
                        onChange={(e) => updateValue(groupIndex, valueIndex, { sku: e.target.value || undefined })}
                        placeholder="SKU (optional)"
                        className="w-36 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs"
                      />
                      <input
                        value={option.image ?? ''}
                        onChange={(e) => updateValue(groupIndex, valueIndex, { image: e.target.value || undefined })}
                        placeholder="/products/uploads/variant.jpg"
                        className="flex-1 min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs"
                      />
                      {onUploadOptionImage && (
                        <label className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg cursor-pointer whitespace-nowrap">
                          {uploadingFor === `${groupIndex}-${valueIndex}` ? 'Uploading...' : 'Upload'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            disabled={uploadingFor === `${groupIndex}-${valueIndex}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadOptionImage(groupIndex, valueIndex, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addValue(groupIndex)}
              disabled={atLimit}
              className="text-sm text-[#00ff9d] hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
              title={
                atLimit
                  ? `Maximum ${MAX_PRODUCT_OPTION_VALUES_PER_GROUP} options — remove one to add more`
                  : undefined
              }
            >
              {atLimit
                ? `Maximum ${MAX_PRODUCT_OPTION_VALUES_PER_GROUP} options reached — remove one to add more`
                : '+ Add another option'}
            </button>
          </div>
        );
      })}
    </div>
  );
}