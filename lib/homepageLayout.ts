import type { SiteFeatures } from '@/lib/featureTypes';
import { isCustomHomepageSectionId } from '@/lib/homepageCopy';

export type BuiltInHomepageSectionId =
  | 'hero'
  | 'board'
  | 'drop'
  | 'categories'
  | 'vibes'
  | 'touchdowns'
  | 'brands'
  | 'bestSellers'
  | 'newArrivals'
  | 'onSale'
  | 'howItWorks'
  | 'merch'
  | 'reviews'
  | 'community'
  | 'loyalty'
  | 'faq';

export type HomepageSectionId = BuiltInHomepageSectionId | string;

export interface HomepageSection {
  id: string;
  enabled: boolean;
}

export interface HomepageSectionMeta {
  label: string;
  blurb: string;
  hempOnly?: boolean;
}

export const HOMEPAGE_SECTION_META: Record<BuiltInHomepageSectionId, HomepageSectionMeta> = {
  hero: { label: 'Hero', blurb: 'Big headline and buttons at the top' },
  board: { label: 'The Board', blurb: 'Live product grid', hempOnly: true },
  drop: { label: 'Drop', blurb: 'Featured drop and countdown', hempOnly: true },
  categories: { label: 'Shop categories', blurb: 'Flower, vapes, merch shortcuts' },
  vibes: { label: 'Moods', blurb: 'How you trying to feel chips', hempOnly: true },
  touchdowns: { label: 'Touchdown wall', blurb: 'Customer TD posts', hempOnly: true },
  brands: { label: 'Brand row', blurb: 'Names we keep stocked', hempOnly: true },
  bestSellers: { label: 'Best sellers', blurb: 'Pinned / top products', hempOnly: true },
  newArrivals: { label: 'New arrivals', blurb: 'Latest additions', hempOnly: true },
  onSale: { label: 'On sale', blurb: 'Sale products', hempOnly: true },
  howItWorks: { label: 'How it works', blurb: 'Shop → checkout → ship' },
  merch: { label: 'Studio merch', blurb: 'Homepage merch pick' },
  reviews: { label: 'Reviews', blurb: 'Customer reviews' },
  community: { label: 'Community', blurb: 'Discord / social block' },
  loyalty: { label: 'Loyalty', blurb: 'Points and perks', hempOnly: true },
  faq: { label: 'FAQ', blurb: 'Homepage questions' },
};

export const HOMEPAGE_SECTION_IDS = Object.keys(HOMEPAGE_SECTION_META) as BuiltInHomepageSectionId[];

/** Homepage hide/show also patches these flags. FAQ stays off this list so hiding the homepage FAQ does not kill /faq or the menu link. */
const FEATURE_KEY: Partial<Record<BuiltInHomepageSectionId, keyof SiteFeatures>> = {
  drop: 'dropHero',
  howItWorks: 'howItWorks',
  merch: 'merchSection',
  reviews: 'reviewsSection',
  community: 'communityBlock',
  loyalty: 'loyaltySection',
  bestSellers: 'bestSellers',
  newArrivals: 'newArrivals',
  onSale: 'onSale',
};

/** Matches the live homepage today. Extra blocks start hidden so turning them on is a real choice. */
export const DEFAULT_HOMEPAGE_SECTIONS: Array<{ id: BuiltInHomepageSectionId; enabled: boolean }> = [
  { id: 'hero', enabled: true },
  { id: 'board', enabled: true },
  { id: 'drop', enabled: true },
  { id: 'categories', enabled: true },
  { id: 'vibes', enabled: true },
  { id: 'touchdowns', enabled: true },
  { id: 'brands', enabled: true },
  { id: 'howItWorks', enabled: true },
  { id: 'merch', enabled: true },
  { id: 'reviews', enabled: true },
  { id: 'community', enabled: true },
  { id: 'loyalty', enabled: true },
  { id: 'bestSellers', enabled: false },
  { id: 'newArrivals', enabled: false },
  { id: 'onSale', enabled: false },
  { id: 'faq', enabled: false },
];

export function isBuiltInHomepageSectionId(value: string): value is BuiltInHomepageSectionId {
  return value in HOMEPAGE_SECTION_META;
}

function defaultEnabled(id: BuiltInHomepageSectionId, features?: SiteFeatures): boolean {
  const fallback = DEFAULT_HOMEPAGE_SECTIONS.find((item) => item.id === id)?.enabled ?? false;
  if (!features) return fallback;
  if (id === 'bestSellers' || id === 'newArrivals' || id === 'onSale' || id === 'faq') {
    return fallback;
  }
  const key = FEATURE_KEY[id];
  if (!key) return fallback;
  const flag = features[key] as { enabled?: boolean } | undefined;
  return flag?.enabled ?? fallback;
}

export function mergeHomepageLayout(
  stored: HomepageSection[] | undefined,
  features?: SiteFeatures,
  customIds: string[] = []
): HomepageSection[] {
  const seen = new Set<string>();
  const next: HomepageSection[] = [];

  for (const item of stored ?? []) {
    if (!item?.id || seen.has(item.id)) continue;
    if (isBuiltInHomepageSectionId(item.id) || isCustomHomepageSectionId(item.id)) {
      seen.add(item.id);
      next.push({ id: item.id, enabled: Boolean(item.enabled) });
    }
  }

  if (next.filter((item) => isBuiltInHomepageSectionId(item.id)).length === 0) {
    const builtins = DEFAULT_HOMEPAGE_SECTIONS.map((item) => ({
      id: item.id,
      enabled: defaultEnabled(item.id, features),
    }));
    const customs = next.filter((item) => isCustomHomepageSectionId(item.id));
    next.length = 0;
    next.push(...builtins, ...customs);
    for (const item of next) seen.add(item.id);
  }

  for (const item of DEFAULT_HOMEPAGE_SECTIONS) {
    if (seen.has(item.id)) continue;
    next.push({ id: item.id, enabled: defaultEnabled(item.id, features) });
    seen.add(item.id);
  }

  for (const id of customIds) {
    if (!isCustomHomepageSectionId(id) || seen.has(id)) continue;
    next.push({ id, enabled: true });
    seen.add(id);
  }

  return next;
}

export function isHempHomepageSection(id: string): boolean {
  if (!isBuiltInHomepageSectionId(id)) return false;
  return HOMEPAGE_SECTION_META[id].hempOnly === true;
}

export function applyHomepageSectionEnabled<
  T extends { homepageLayout?: { sections: HomepageSection[] }; features: SiteFeatures },
>(content: T, id: string, enabled: boolean): T {
  const sections = mergeHomepageLayout(content.homepageLayout?.sections, content.features).map((item) =>
    item.id === id ? { ...item, enabled } : item
  );
  const features = { ...content.features };
  const key = isBuiltInHomepageSectionId(id) ? FEATURE_KEY[id] : undefined;
  if (key) {
    (features as unknown as Record<string, unknown>)[key] = {
      ...features[key],
      enabled,
    };
  }
  return {
    ...content,
    homepageLayout: { sections },
    features,
  };
}

export function applyHomepageSectionOrder<
  T extends { homepageLayout?: { sections: HomepageSection[] }; features: SiteFeatures },
>(content: T, sections: HomepageSection[]): T {
  return {
    ...content,
    homepageLayout: { sections: mergeHomepageLayout(sections, content.features) },
  };
}

export function getHomepageSectionMeta(id: string): HomepageSectionMeta {
  if (isBuiltInHomepageSectionId(id)) return HOMEPAGE_SECTION_META[id];
  return { label: 'Custom block', blurb: 'Your own text, image, or video' };
}
