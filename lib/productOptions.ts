import type { Product } from '@/lib/products';

export interface ProductOptionValue {
  label: string;
  priceAdjustment?: number;
  /** Internal SKU for fulfillment — shown in admin orders */
  sku?: string;
  /** Optional swatch/variant image URL */
  image?: string;
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
          sku: value.sku?.trim() || undefined,
          image: value.image?.trim() || undefined,
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

function splitSkuFromLine(line: string): { body: string; sku?: string } {
  const bracket = line.match(/^(.+?)\s*\[([^\]]+)\]\s*$/);
  if (bracket) {
    return { body: bracket[1].trim(), sku: bracket[2].trim() };
  }

  const pipe = line.match(/^(.+?)\s*\|\s*(.+)$/);
  if (pipe) {
    return { body: pipe[1].trim(), sku: pipe[2].trim() };
  }

  return { body: line };
}

export function parseOptionValueLine(line: string): ProductOptionValue | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const { body, sku } = splitSkuFromLine(trimmed);

  const priced = body.match(/^(.+?)\s*\(\+\$?(\d+(?:\.\d+)?)\)\s*$/);
  if (priced) {
    return {
      label: priced[1].trim(),
      priceAdjustment: Number(priced[2]),
      sku,
    };
  }

  const inlinePriced = body.match(/^(.+?)\s+\+\$?(\d+(?:\.\d+)?)\s*$/);
  if (inlinePriced) {
    return {
      label: inlinePriced[1].trim(),
      priceAdjustment: Number(inlinePriced[2]),
      sku,
    };
  }

  return { label: body, sku };
}

export function serializeOptionValue(value: ProductOptionValue): string {
  let line = value.label;
  if (value.priceAdjustment && value.priceAdjustment !== 0) {
    line += ` (+$${value.priceAdjustment})`;
  }
  if (value.sku) {
    line += ` [${value.sku}]`;
  }
  return line;
}

export interface OptionImportResult {
  values: ProductOptionValue[];
  imported: number;
  truncated: number;
  duplicateSkipped: number;
}

export function importOptionValuesIntoGroup(
  existing: ProductOptionValue[],
  text: string,
  mode: 'append' | 'replace' = 'append'
): OptionImportResult {
  const parsed = parseOptionGroupValuesText(text);
  const base = mode === 'replace' ? [] : existing.filter((item) => item.label.trim());
  const seen = new Set(base.map((item) => item.label.toLowerCase()));
  const merged = [...base];
  let imported = 0;
  let truncated = 0;
  let duplicateSkipped = 0;

  for (const value of parsed) {
    const key = value.label.toLowerCase();
    if (seen.has(key)) {
      duplicateSkipped += 1;
      continue;
    }
    if (merged.length >= MAX_PRODUCT_OPTION_VALUES_PER_GROUP) {
      truncated += 1;
      continue;
    }
    seen.add(key);
    merged.push(value);
    imported += 1;
  }

  return { values: merged, imported, truncated, duplicateSkipped };
}

export function getSelectedOptionsImage(
  product: Product,
  selected: SelectedProductOptions
): string | undefined {
  for (const group of getProductOptionGroups(product)) {
    const label = selected[group.name];
    if (!label) continue;
    const value = getOptionValue(product, group.name, label);
    if (value?.image) return value.image;
  }
  return undefined;
}

export function getSelectedOptionsSkus(
  product: Product,
  selected: SelectedProductOptions
): string[] {
  const skus: string[] = [];
  for (const group of getProductOptionGroups(product)) {
    const label = selected[group.name];
    if (!label) continue;
    const value = getOptionValue(product, group.name, label);
    if (value?.sku) skus.push(value.sku);
  }
  return skus;
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

export function formatCartItemOptions(
  item: {
    selectedOptions?: SelectedProductOptions;
    selectedSize?: string;
    optionSkus?: string;
  },
  product?: Product,
  options?: { includeSku?: boolean }
): string | null {
  const includeSku = options?.includeSku ?? false;

  if (item.selectedOptions && Object.keys(item.selectedOptions).length > 0) {
    const parts = Object.entries(item.selectedOptions).map(([group, value]) => {
      let part = `${group}: ${value}`;
      if (includeSku && product) {
        const sku = getOptionValue(product, group, value)?.sku;
        if (sku) part += ` (${sku})`;
      }
      return part;
    });
    let line = parts.join(' · ');
    if (includeSku && item.optionSkus) {
      line += ` · SKU: ${item.optionSkus}`;
    }
    return line;
  }
  if (item.selectedSize) {
    return includeSku && item.optionSkus
      ? `${item.selectedSize} · SKU: ${item.optionSkus}`
      : item.selectedSize;
  }
  return null;
}

export function formatSelectedOptionSkus(skus: string[]): string | undefined {
  const cleaned = skus.map((sku) => sku.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(' · ') : undefined;
}