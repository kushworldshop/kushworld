'use client';

import type { ProductOptionGroup, ProductOptionValue } from '@/lib/productOptions';
import {
  DEVICE_OPTION_GROUP_PRESETS,
  isDeviceStyleProductCategory,
  MAX_PRODUCT_OPTION_GROUPS,
  MAX_PRODUCT_OPTION_VALUES_PER_GROUP,
} from '@/lib/productOptions';

interface ProductOptionsEditorProps {
  value: ProductOptionGroup[];
  onChange: (groups: ProductOptionGroup[]) => void;
  productCategory?: string;
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
}: ProductOptionsEditorProps) {
  const groups = normalizeGroups(value.length > 0 ? value : []);
  const isDeviceProduct = isDeviceStyleProductCategory(productCategory);

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
          }))
          .filter((item) => item.label || item.priceAdjustment !== undefined)
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
  };

  const addGroup = (presetName?: string) => {
    if (groups.length >= MAX_PRODUCT_OPTION_GROUPS) return;
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
    if (group.values.length >= MAX_PRODUCT_OPTION_VALUES_PER_GROUP) return;
    updateGroup(groupIndex, { ...group, values: [...group.values, emptyValue()] });
  };

  const removeValue = (groupIndex: number, valueIndex: number) => {
    const group = groups[groupIndex];
    const values = group.values.filter((_, i) => i !== valueIndex);
    updateGroup(groupIndex, {
      ...group,
      values: values.length > 0 ? values : [emptyValue()],
    });
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
        <button
          type="button"
          onClick={() => addGroup()}
          disabled={groups.length >= MAX_PRODUCT_OPTION_GROUPS}
          className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
        >
          + Add option group
        </button>
      </div>

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
                <span className="text-xs text-zinc-500">
                  {filledCount}/{MAX_PRODUCT_OPTION_VALUES_PER_GROUP}
                </span>
                <button
                  type="button"
                  onClick={() => removeGroup(groupIndex)}
                  className="text-red-400 hover:text-red-300 text-sm px-3 py-2"
                >
                  Remove group
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {group.values.map((option, valueIndex) => (
                <div key={valueIndex} className="flex flex-wrap items-center gap-2">
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
                    <input
                      type="number"
                      step={0.01}
                      value={option.priceAdjustment ?? ''}
                      onChange={(e) =>
                        updateValue(groupIndex, valueIndex, {
                          priceAdjustment: e.target.value === '' ? undefined : Number(e.target.value),
                        })
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
              ))}
            </div>

            <button
              type="button"
              onClick={() => addValue(groupIndex)}
              disabled={atLimit}
              className="text-sm text-[#00ff9d] hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {atLimit
                ? `Maximum ${MAX_PRODUCT_OPTION_VALUES_PER_GROUP} options reached`
                : '+ Add another option'}
            </button>
          </div>
        );
      })}
    </div>
  );
}