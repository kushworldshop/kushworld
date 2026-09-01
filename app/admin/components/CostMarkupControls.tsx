'use client';

import { getFlowerWeightPrice, isFlowerProductCategory } from '@/lib/flowerWeights';
import { sellFromCost, type PriceMarkup } from '@/lib/customerPricing';

export default function CostMarkupControls({
  cost,
  category,
  markup,
  onCostChange,
  onApply,
}: {
  cost: number;
  category: string;
  markup?: number;
  onCostChange: (cost: number) => void;
  onApply: (markup: PriceMarkup, sellPrice: number) => void;
}) {
  const isFlower = isFlowerProductCategory(category);

  return (
    <div className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 space-y-3">
      <p className="text-xs text-zinc-400">
        Enter what you paid. 2x or 3x fills shop prices and rounds them so customers see normal numbers.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
            Purchase cost ($) {isFlower ? '— per pound' : '— per item'}
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={cost || ''}
            onChange={(event) => onCostChange(Math.max(0, Number(event.target.value) || 0))}
            className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end gap-2">
          {([2, 3] as PriceMarkup[]).map((value) => {
            const sell = sellFromCost(cost, value);
            const zip = isFlower ? getFlowerWeightPrice(sell, 28) : sell;
            const disabled = cost <= 0;
            const active = markup === value;
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => onApply(value, sell)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition disabled:opacity-40 ${
                  active
                    ? 'bg-[#00ff9d] text-black border-[#00ff9d]'
                    : 'border-zinc-700 hover:border-[#00ff9d] text-zinc-200'
                }`}
              >
                {value}x
                {sell > 0 && (
                  <span className="block text-[11px] font-medium opacity-80">
                    {isFlower ? `oz $${zip}` : `$${sell}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
