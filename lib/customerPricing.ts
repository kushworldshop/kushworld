export type PriceMarkup = 2 | 3;

export function isPriceMarkup(value: unknown): value is PriceMarkup {
  return value === 2 || value === 3;
}

/** Round a sell price so customers see normal shop numbers, not $6.25 / $796.43. */
export function roundCustomerPrice(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount < 8) return 10;
  if (amount < 100) return Math.round(amount / 5) * 5;
  if (amount < 400) return Math.round(amount / 10) * 10;
  return Math.round(amount / 25) * 25;
}

export function sellFromCost(cost: number, markup: PriceMarkup): number {
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  return roundCustomerPrice(cost * markup);
}
