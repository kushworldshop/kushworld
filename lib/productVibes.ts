import type { Product } from '@/lib/products';

export interface ShopVibe {
  id: string;
  label: string;
  emoji: string;
}

export const SHOP_VIBES: ShopVibe[] = [
  { id: 'relax', label: 'Relax & Sleep', emoji: '😴' },
  { id: 'focus', label: 'Focus', emoji: '🎯' },
  { id: 'social', label: 'Social', emoji: '🎉' },
  { id: 'relief', label: 'Relief', emoji: '💚' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'energy', label: 'Energy', emoji: '⚡' },
  { id: 'euphoric', label: 'Euphoric', emoji: '✨' },
];

const VIBE_KEYWORDS: Record<string, string[]> = {
  relax: ['relax', 'sleep', 'calm', 'indica', 'couch'],
  focus: ['focus', 'alert', 'productive', 'clear'],
  social: ['social', 'talkative', 'party', 'uplifting'],
  relief: ['relief', 'comfort', 'soothe', 'body'],
  creative: ['creative', 'inspire', 'artistic'],
  energy: ['energy', 'active', 'sativa', 'daytime'],
  euphoric: ['euphoric', 'happy', 'mood', 'giggly', 'candy', 'sweet'],
};

export function getProductEffects(product: Product): string[] {
  if (product.effects?.length) return product.effects;
  if (product.effect) return [product.effect];
  return [];
}

export function productMatchesVibe(product: Product, vibeId: string): boolean {
  const effects = getProductEffects(product);
  if (effects.includes(vibeId)) return true;

  const keywords = VIBE_KEYWORDS[vibeId] ?? [];
  const haystack = `${product.name} ${product.description ?? ''} ${product.strainType ?? ''} ${product.tier ?? ''}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

export function getVibeLabel(vibeId: string): string {
  return SHOP_VIBES.find((vibe) => vibe.id === vibeId)?.label ?? vibeId;
}