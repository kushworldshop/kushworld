'use client';

import type { Product } from '@/lib/products';
import {
  formatOptionValuePriceSuffix,
  getOptionValue,
  getProductOptionGroups,
  getSizeOptionGroup,
  isOptionGroupRequired,
  isWholeBoxSizeValue,
  PRODUCT_OPTION_DROPDOWN_THRESHOLD,
  type SelectedProductOptions,
} from '@/lib/productOptions';

interface ProductOptionSelectorProps {
  product: Product;
  selected: SelectedProductOptions;
  onChange: (selected: SelectedProductOptions) => void;
  size?: 'sm' | 'md';
}

export default function ProductOptionSelector({
  product,
  selected,
  onChange,
  size = 'md',
}: ProductOptionSelectorProps) {
  const groups = getProductOptionGroups(product);
  if (groups.length === 0) return null;

  const visibleGroups = groups.filter((group) =>
    isOptionGroupRequired(product, group.name, selected)
  );

  const handleGroupChange = (groupName: string, valueLabel: string) => {
    const next = { ...selected, [groupName]: valueLabel };
    const sizeGroup = getSizeOptionGroup(product);

    if (sizeGroup && groupName === sizeGroup.name && isWholeBoxSizeValue(product, sizeGroup.name, valueLabel)) {
      for (const group of groups) {
        if (group.name !== sizeGroup.name) {
          delete next[group.name];
        }
      }
    }

    onChange(next);
  };

  const labelClass = size === 'sm' ? 'text-xs text-zinc-400 mb-2' : 'text-sm text-zinc-400 mb-3';
  const buttonClass = size === 'sm' ? 'px-3 py-1.5 text-xs rounded-xl' : 'px-4 py-2 rounded-xl text-sm';
  const selectClass =
    size === 'sm'
      ? 'w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs'
      : 'w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm';

  return (
    <>
      {visibleGroups.map((group) => {
        const useDropdown = group.values.length > PRODUCT_OPTION_DROPDOWN_THRESHOLD;
        const currentValue = selected[group.name] ?? '';

        return (
          <div key={group.name} className={size === 'sm' ? 'mb-4' : 'mb-6'}>
            <p className={labelClass}>
              {group.name}
              {group.values.length > 1 && (
                <span className="text-zinc-600 ml-2">({group.values.length} choices)</span>
              )}
            </p>

            {useDropdown ? (
              <select
                value={currentValue}
                onChange={(e) => handleGroupChange(group.name, e.target.value)}
                className={selectClass}
              >
                <option value="" disabled>
                  Select {group.name.toLowerCase()}...
                </option>
                {group.values.map((value) => (
                  <option key={`${group.name}-${value.label}`} value={value.label}>
                    {value.label}
                    {formatOptionValuePriceSuffix(value)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const isSelected = currentValue === value.label;
                  const option = getOptionValue(product, group.name, value.label);
                  return (
                    <button
                      key={`${group.name}-${value.label}`}
                      type="button"
                      onClick={() => handleGroupChange(group.name, value.label)}
                      className={`${buttonClass} transition inline-flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#00ff9d] text-black font-medium'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                      }`}
                    >
                      {option?.image && (
                        <img
                          src={option.image}
                          alt=""
                          className="w-5 h-5 rounded-md object-cover"
                        />
                      )}
                      <span>
                        {value.label}
                        {formatOptionValuePriceSuffix(value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}