import { getSizeUnitAndBoxPricing } from '@/lib/productOptions';
import type { ProductOptionGroup } from '@/lib/productOptions';

export interface ProductMargin {
  profit: number;
  marginPercent: number;
  markupPercent: number;
}

export interface ProductSellMarginLine {
  label: string;
  sellPrice: number;
  cost: number;
  margin: ProductMargin;
}

export interface ProductSellMargins {
  lines: ProductSellMarginLine[];
}

export function getProductMargin(sellPrice: number, cost?: number): ProductMargin | null {
  if (cost === undefined || cost === null || Number.isNaN(cost) || cost <= 0) return null;

  const profit = sellPrice - cost;
  const marginPercent = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;
  const markupPercent = cost > 0 ? (profit / cost) * 100 : 0;

  return {
    profit,
    marginPercent,
    markupPercent,
  };
}

export function getProductSellMargins(input: {
  price: number;
  cost?: number;
  optionGroups?: ProductOptionGroup[];
}): ProductSellMargins | null {
  const unitCost = input.cost;
  if (unitCost === undefined || unitCost === null || Number.isNaN(unitCost) || unitCost <= 0) {
    return null;
  }

  const sizePricing = getSizeUnitAndBoxPricing({
    price: input.price,
    optionGroups: input.optionGroups,
  });

  if (sizePricing) {
    const unitMargin = getProductMargin(sizePricing.unitSellPrice, unitCost);
    const boxMargin = getProductMargin(
      sizePricing.boxSellPrice,
      unitCost * sizePricing.unitsPerBox
    );

    const lines: ProductSellMarginLine[] = [];
    if (unitMargin) {
      lines.push({
        label: 'Per device',
        sellPrice: sizePricing.unitSellPrice,
        cost: unitCost,
        margin: unitMargin,
      });
    }
    if (boxMargin) {
      lines.push({
        label: `Per box (${sizePricing.boxLabel})`,
        sellPrice: sizePricing.boxSellPrice,
        cost: unitCost * sizePricing.unitsPerBox,
        margin: boxMargin,
      });
    }

    return lines.length > 0 ? { lines } : null;
  }

  const margin = getProductMargin(input.price, unitCost);
  if (!margin) return null;

  return {
    lines: [
      {
        label: 'Per unit',
        sellPrice: input.price,
        cost: unitCost,
        margin,
      },
    ],
  };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(amount: number): string {
  return `${amount.toFixed(1)}%`;
}