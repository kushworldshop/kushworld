export interface ProductMargin {
  profit: number;
  marginPercent: number;
  markupPercent: number;
}

export function getProductMargin(sellPrice: number, cost?: number): ProductMargin | null {
  if (cost === undefined || cost === null || Number.isNaN(cost)) return null;

  const profit = sellPrice - cost;
  const marginPercent = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;
  const markupPercent = cost > 0 ? (profit / cost) * 100 : 0;

  return {
    profit,
    marginPercent,
    markupPercent,
  };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatPercent(amount: number): string {
  return `${amount.toFixed(1)}%`;
}