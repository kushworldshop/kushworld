import type { Product } from '@/lib/products';
import { getVibeLabel, getProductEffects } from '@/lib/productVibes';

export default function ProductMetaBadges({
  product,
  size = 'sm',
}: {
  product: Product;
  size?: 'sm' | 'md';
}) {
  const isMerch = product.category === 'merch';
  if (isMerch) return null;

  const effects = getProductEffects(product);
  const pillClass =
    size === 'md'
      ? 'text-xs px-2.5 py-1 rounded-full font-medium'
      : 'text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide';

  const badges: { key: string; label: string; className: string }[] = [];

  if (product.thcaPercent) {
    badges.push({
      key: 'thca',
      label: `${product.thcaPercent}% THCa`,
      className: 'bg-[#00ff9d]/15 text-[#00ff9d] border border-[#00ff9d]/30',
    });
  }

  if (product.strainType) {
    badges.push({
      key: 'strain',
      label: product.strainType,
      className: 'bg-zinc-800 text-zinc-200 border border-zinc-700',
    });
  }

  if (product.tier) {
    badges.push({
      key: 'tier',
      label: product.tier,
      className: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    });
  }

  for (const effect of effects.slice(0, 2)) {
    badges.push({
      key: `effect-${effect}`,
      label: getVibeLabel(effect),
      className: 'bg-purple-500/15 text-purple-200 border border-purple-500/25',
    });
  }

  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span key={badge.key} className={`${pillClass} ${badge.className}`}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}