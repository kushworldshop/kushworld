import type { SiteFeatures } from '@/lib/featureTypes';

export type HomepageSectionId =
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

export interface HomepageSection {
  id: HomepageSectionId;
  enabled: boolean;
}

export interface HomepageSectionMeta {
  label: string;
  blurb: string;
  hempOnly?: boolean;
}

export const HOMEPAGE_SECTION_META: Record<HomepageSectionId, HomepageSectionMeta> = {
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

export const HOMEPAGE_SECTION_IDS = Object.keys(HOMEPAGE_SECTION_META) as HomepageSectionId[];

/** Homepage hide/show also patches these flags. FAQ stays off this list so hiding the homepage FAQ does not kill /faq or the menu link. */
const FEATURE_KEY: Partial<Record<HomepageSectionId, keyof SiteFeatures>> = {
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
export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
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

function isHomepageSectionId(value: string): value is HomepageSectionId {
  return value in HOMEPAGE_SECTION_META;
}

function defaultEnabled(id: HomepageSectionId, features?: SiteFeatures): boolean {
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
  features?: SiteFeatures
): HomepageSection[] {
  const seen = new Set<HomepageSectionId>();
  const next: HomepageSection[] = [];

  for (const item of stored ?? []) {
    if (!item || !isHomepageSectionId(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    next.push({ id: item.id, enabled: Boolean(item.enabled) });
  }

  if (next.length === 0) {
    return DEFAULT_HOMEPAGE_SECTIONS.map((item) => ({
      id: item.id,
      enabled: defaultEnabled(item.id, features),
    }));
  }

  for (const item of DEFAULT_HOMEPAGE_SECTIONS) {
    if (seen.has(item.id)) continue;
    next.push({ id: item.id, enabled: defaultEnabled(item.id, features) });
  }

  return next;
}

export function isHempHomepageSection(id: HomepageSectionId): boolean {
  return HOMEPAGE_SECTION_META[id].hempOnly === true;
}

export function applyHomepageSectionEnabled<
  T extends { homepageLayout?: { sections: HomepageSection[] }; features: SiteFeatures },
>(content: T, id: HomepageSectionId, enabled: boolean): T {
  const sections = mergeHomepageLayout(content.homepageLayout?.sections, content.features).map((item) =>
    item.id === id ? { ...item, enabled } : item
  );
  const features = { ...content.features };
  const key = FEATURE_KEY[id];
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
