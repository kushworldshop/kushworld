import type { Product } from '@/lib/products';

export interface ProductOptionValue {
  label: string;
  priceAdjustment?: number;
}

export interface ProductOptionGroup {
  name: string;
  values: ProductOptionValue[];
}

export const MAX_PRODUCT_OPTION_VALUES_PER_GROUP = 20;
export const MAX_PRODUCT_OPTION_GROUPS = 6;
/** Use a dropdown on the shop when a group has more than this many choices */
export const PRODUCT_OPTION_DROPDOWN_THRESHOLD = 8;

export const DEVICE_OPTION_GROUP_PRESETS = [
  { name: 'Model', placeholder: 'e.g. Blue, Black, Limited Edition' },
  { name: 'Color', placeholder: 'e.g. Midnight, Silver, Rose Gold' },
  { name: 'Variant', placeholder: 'e.g. 1g Pod, 2g Pod, Starter Kit' },
] as const;

export function isDeviceStyleProductCategory(category?: string): boolean {
  const normalized = category?.toLowerCase().trim();
  return normalized === 'vapes' || normalized === 'vaporizers';
}

export function clampProductOptionGroups(groups: ProductOptionGroup[]): ProductOptionGroup[] {
  return groups
    .slice(0, MAX_PRODUCT_OPTION_GROUPS)
    .map((group) => ({
      name: group.name.trim(),
      values: group.values
        .map((value) => ({
          label: value.label.trim(),
          priceAdjustment:
            value.priceAdjustment !== undefined && !Number.isNaN(Number(value.priceAdjustment))
              ? Number(value.priceAdjustment)
              : undefined,
        }))
        .filter((value) => value.label)
        .slice(0, MAX_PRODUCT_OPTION_VALUES_PER_GROUP),
    }))
    .filter((group) => group.name && group.values.length > 0);
}

export type SelectedProductOptions = Record<string, string>;

export function getProductOptionGroups(product: Product): ProductOptionGroup[] {
  if (product.optionGroups?.length) {
    return product.optionGroups.filter((group) => group.name.trim() && group.values.length > 0);
  }

  const groups: ProductOptionGroup[] = [];

  if (product.colors?.length) {
    groups.push({
      name: 'Color',
      values: product.colors.map((label) => ({ label })),
    });
  }

  if (product.sizes?.length) {
    groups.push({
      name: 'Size',
      values: product.sizes.map((label) => ({ label })),
    });
  }

  return groups;
}

export function productHasOptions(product: Product): boolean {
  return getProductOptionGroups(product).length > 0;
}

export function getDefaultSelectedOptions(product: Product): SelectedProductOptions {
  const selected: SelectedProductOptions = {};
  for (const group of getProductOptionGroups(product)) {
    if (group.values[0]) {
      selected[group.name] = group.values[0].label;
    }
  }
  return selected;
}

export function getOptionValue(
  product: Product,
  groupName: string,
  valueLabel: string
): ProductOptionValue | undefined {
  const group = getProductOptionGroups(product).find((item) => item.name === groupName);
  return group?.values.find((value) => value.label === valueLabel);
}

export function getSelectedOptionsPriceAdjustment(
  product: Product,
  selected: SelectedProductOptions
): number {
  return Object.entries(selected).reduce((sum, [groupName, valueLabel]) => {
    const value = getOptionValue(product, groupName, valueLabel);
    return sum + (value?.priceAdjustment ?? 0);
  }, 0);
}

export function getSelectedOptionsUnitPrice(
  product: Product,
  selected: SelectedProductOptions,
  quantity = 1,
  tierPrice?: (basePrice: number, qty: number) => number
): number {
  const baseWithOptions = product.price + getSelectedOptionsPriceAdjustment(product, selected);
  return tierPrice ? tierPrice(baseWithOptions, quantity) : baseWithOptions;
}

export function formatSelectedOptionsLabel(selected: SelectedProductOptions): string {
  return Object.values(selected).filter(Boolean).join(' / ');
}

export function getVariantKey(selected?: SelectedProductOptions, legacyLabel?: string): string {
  if (selected && Object.keys(selected).length > 0) {
    return Object.keys(selected)
      .sort()
      .map((key) => `${key}:${selected[key]}`)
      .join('|');
  }
  return legacyLabel ?? '';
}

export function cartItemsMatchVariant(
  a: { selectedOptions?: SelectedProductOptions; selectedSize?: string },
  b: { selectedOptions?: SelectedProductOptions; selectedSize?: string }
): boolean {
  return getVariantKey(a.selectedOptions, a.selectedSize) === getVariantKey(b.selectedOptions, b.selectedSize);
}

export function validateSelectedOptions(
  product: Product,
  selected: SelectedProductOptions
): { valid: boolean; missingGroup?: string } {
  for (const group of getProductOptionGroups(product)) {
    const value = selected[group.name];
    if (!value) {
      return { valid: false, missingGroup: group.name };
    }
    if (!getOptionValue(product, group.name, value)) {
      return { valid: false, missingGroup: group.name };
    }
  }
  return { valid: true };
}

export function parseOptionValueLine(line: string): ProductOptionValue | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const priced = trimmed.match(/^(.+?)\s*\(\+\$?(\d+(?:\.\d+)?)\)\s*$/);
  if (priced) {
    return {
      label: priced[1].trim(),
      priceAdjustment: Number(priced[2]),
    };
  }

  const inlinePriced = trimmed.match(/^(.+?)\s+\+\$?(\d+(?:\.\d+)?)\s*$/);
  if (inlinePriced) {
    return {
      label: inlinePriced[1].trim(),
      priceAdjustment: Number(inlinePriced[2]),
    };
  }

  return { label: trimmed };
}

export function serializeOptionValue(value: ProductOptionValue): string {
  if (value.priceAdjustment && value.priceAdjustment !== 0) {
    return `${value.label} (+$${value.priceAdjustment})`;
  }
  return value.label;
}

export function parseOptionGroupValuesText(text: string): ProductOptionValue[] {
  return text
    .split('\n')
    .map(parseOptionValueLine)
    .filter((value): value is ProductOptionValue => value !== null);
}

export function serializeOptionGroupValues(values: ProductOptionValue[]): string {
  return values.map(serializeOptionValue).join('\n');
}

export function formatCartItemOptions(item: {
  selectedOptions?: SelectedProductOptions;
  selectedSize?: string;
}): string | null {
  if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
    return Object.entries(item.selectedOptions)
      .map(([group, value]) => `${group}: ${value}`)
      .join(' · ');
  }
  if (item.selectedSize) return item.selectedSize;
  return null;
}