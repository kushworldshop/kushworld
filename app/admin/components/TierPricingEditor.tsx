'use client';

import AdminNumberInput from '@/app/admin/components/AdminNumberInput';
import {
  describeAutoTierPricingRules,
  formatTierPricingSummary,
  getDefaultTierPricing,
} from '@/lib/tierPricing';
import type { TierPrice } from '@/lib/products';

interface TierPricingEditorProps {
  sellPrice: number;
  showOnShop: boolean;
  useCustom: boolean;
  tiers: TierPrice[];
  onShowOnShopChange: (showOnShop: boolean) => void;
  onUseCustomChange: (useCustom: boolean) => void;
  onTiersChange: (tiers: TierPrice[]) => void;
}

export default function TierPricingEditor({
  sellPrice,
  showOnShop,
  useCustom,
  tiers,
  onShowOnShopChange,
  onUseCustomChange,
  onTiersChange,
}: TierPricingEditorProps) {
  const autoTiers = getDefaultTierPricing(sellPrice);
  const displayTiers = useCustom ? tiers : autoTiers;

  const updateTier = (index: number, patch: Partial<TierPrice>) => {
    onTiersChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  };

  const addTier = () => {
    const nextMinQty =
      tiers.length > 0 ? Math.max(...tiers.map((tier) => tier.minQty)) + 1 : autoTiers[0]?.minQty ?? 5;
    onTiersChange(
      [...tiers, { minQty: nextMinQty, price: Math.round(sellPrice * 0.95 * 100) / 100 }].sort(
        (a, b) => a.minQty - b.minQty
      )
    );
  };

  const removeTier = (index: number) => {
    onTiersChange(tiers.filter((_, i) => i !== index));
  };

  const handleCustomToggle = (checked: boolean) => {
    onUseCustomChange(checked);
    if (checked && tiers.length === 0) {
      onTiersChange(autoTiers.length > 0 ? autoTiers : [{ minQty: 5, price: Math.round(sellPrice * 0.95 * 100) / 100 }]);
    }
  };

  return (
    <div
      className={`sm:col-span-2 rounded-xl border p-4 space-y-3 transition ${
        showOnShop ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-800/80 bg-zinc-950/60'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Bulk pricing</p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Shown on the product page when quantity tiers apply. {describeAutoTierPricingRules()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnShop}
              onChange={(e) => onShowOnShopChange(e.target.checked)}
              className="w-4 h-4 accent-[#00ff9d]"
            />
            Show on shop
          </label>
          <label
            className={`flex items-center gap-2 text-xs cursor-pointer ${
              showOnShop ? 'text-zinc-300' : 'text-zinc-600'
            }`}
          >
            <input
              type="checkbox"
              checked={useCustom}
              disabled={!showOnShop}
              onChange={(e) => handleCustomToggle(e.target.checked)}
              className="w-4 h-4 accent-[#00ff9d] disabled:opacity-40"
            />
            Custom tiers
          </label>
        </div>
      </div>

      <p className={`text-[11px] ${showOnShop ? 'text-[#00ff9d]/90' : 'text-zinc-500'}`}>
        {showOnShop
          ? `Shop shows: ${formatTierPricingSummary(displayTiers)}${
              !useCustom && displayTiers.length > 0 ? ' (automatic)' : ''
            }`
          : 'Bulk section hidden on product page. Tier settings are saved if you turn it back on.'}
      </p>

      {!showOnShop ? null : displayTiers.length === 0 ? (
        <p className="text-xs text-zinc-500">
          No bulk tiers at this sell price. Raise sell price to $50+ or enable custom tiers.
        </p>
      ) : useCustom ? (
        <div className="space-y-2">
          {tiers.map((tier, index) => (
            <div key={`tier-${index}`} className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                Min qty
                <AdminNumberInput
                  value={tier.minQty}
                  onChange={(minQty) => updateTier(index, { minQty: minQty ?? 2 })}
                  integer
                  className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-500">
                Price $
                <AdminNumberInput
                  value={tier.price}
                  onChange={(price) => updateTier(index, { price: price ?? 0 })}
                  className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <span className="text-xs text-zinc-600">each at {tier.minQty}+ units</span>
              <button
                type="button"
                onClick={() => removeTier(index)}
                className="text-xs text-zinc-500 hover:text-red-400 px-2 py-1"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTier}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-[#00ff9d]/40 hover:text-[#00ff9d]"
          >
            + Add tier
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {autoTiers.map((tier) => (
            <p key={tier.minQty} className="text-xs text-zinc-400">
              {tier.minQty}+ units: ${tier.price.toFixed(2)} each
            </p>
          ))}
        </div>
      )}
    </div>
  );
}