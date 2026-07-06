import type { Product } from '@/lib/products';
import type { ProductOptionGroup } from '@/lib/productOptions';

/** Standard B2B flower weights; base sell price is for the full pound (446g). */
export const FLOWER_POUND_GRAMS = 446;
export const FLOWER_WEIGHT_GRAMS = [7, 14, 28, 112, 228, 446] as const;
export const FLOWER_WEIGHT_OPTION_GROUP_NAME = 'Weight';

export function isFlowerProductCategory(category?: string): boolean {
  return category?.toLowerCase().trim() === 'flower';
}

export function formatFlowerWeightLabel(grams: number): string {
  if (grams === FLOWER_POUND_GRAMS) return `${grams}g (1 lb)`;
  return `${grams}g`;
}

export function getFlowerWeightPrice(poundPrice: number, grams: number): number {
  if (!Number.isFinite(poundPrice) || poundPrice <= 0 || grams <= 0) return 0;
  return Math.round(((poundPrice * grams) / FLOWER_POUND_GRAMS) * 100) / 100;
}

export function buildFlowerWeightOptionGroup(poundPrice: number): ProductOptionGroup {
  return {
    name: FLOWER_WEIGHT_OPTION_GROUP_NAME,
    values: FLOWER_WEIGHT_GRAMS.map((grams) => ({
      label: formatFlowerWeightLabel(grams),
      optionPrice: getFlowerWeightPrice(poundPrice, grams),
    })),
  };
}

export function hasFlowerWeightOptionGroup(optionGroups?: ProductOptionGroup[]): boolean {
  return (optionGroups ?? []).some(
    (group) => group.name.trim().toLowerCase() === FLOWER_WEIGHT_OPTION_GROUP_NAME.toLowerCase()
  );
}

export function productHasFlowerWeightOptions(
  product: Pick<Product, 'category' | 'optionGroups'>
): boolean {
  return isFlowerProductCategory(product.category) && hasFlowerWeightOptionGroup(product.optionGroups);
}

export function mergeFlowerWeightOptionGroups(
  optionGroups: ProductOptionGroup[] | undefined,
  poundPrice: number
): ProductOptionGroup[] {
  const weightGroup = buildFlowerWeightOptionGroup(poundPrice);
  const others = (optionGroups ?? []).filter(
    (group) =>
      group.name.trim().toLowerCase() !== FLOWER_WEIGHT_OPTION_GROUP_NAME.toLowerCase()
  );
  return [weightGroup, ...others];
}

export function stripFlowerWeightOptionGroups(
  optionGroups: ProductOptionGroup[] | undefined
): ProductOptionGroup[] | undefined {
  const next = (optionGroups ?? []).filter(
    (group) =>
      group.name.trim().toLowerCase() !== FLOWER_WEIGHT_OPTION_GROUP_NAME.toLowerCase()
  );
  return next.length > 0 ? next : undefined;
}

export function applyFlowerProductOptions<
  T extends Pick<Product, 'category' | 'price' | 'optionGroups' | 'hideBulkPricing'>,
>(product: T): T {
  if (!isFlowerProductCategory(product.category)) return product;
  return {
    ...product,
    optionGroups: mergeFlowerWeightOptionGroups(product.optionGroups, product.price),
    hideBulkPricing: true,
  };
}

export function describeFlowerSellPrice(poundPrice: number): string {
  const min = getFlowerWeightPrice(poundPrice, FLOWER_WEIGHT_GRAMS[0]);
  const max = getFlowerWeightPrice(poundPrice, FLOWER_POUND_GRAMS);
  return `From $${min.toFixed(2)} – $${max.toFixed(2)} (${FLOWER_WEIGHT_GRAMS.map((g) => `${g}g`).join(', ')}) · base $${poundPrice.toFixed(2)} / ${FLOWER_POUND_GRAMS}g`;
}