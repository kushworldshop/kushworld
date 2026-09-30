export interface HomepageTextBlock {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface HomepageCategoryItem {
  label: string;
  icon: string;
  href: string;
}

export interface HomepageCopy {
  board: HomepageTextBlock;
  categories: {
    title: string;
    merchOnlyTitle: string;
    items: HomepageCategoryItem[];
  };
  vibes: {
    eyebrow: string;
    title: string;
  };
  touchdowns: HomepageTextBlock & {
    emptyTitle: string;
    emptyBody: string;
    emptyCtaLabel: string;
  };
  brands: {
    eyebrow: string;
    title: string;
  };
}

export type CustomBlockKind = 'text' | 'image' | 'imageText' | 'video';

export interface CustomHomepageBlock {
  id: string;
  kind: CustomBlockKind;
  eyebrow: string;
  title: string;
  body: string;
  imageUrl: string;
  videoUrl: string;
  ctaLabel: string;
  ctaHref: string;
  imagePosition: 'top' | 'left' | 'right' | 'background';
}

export const CUSTOM_SECTION_PREFIX = 'custom_';

export const DEFAULT_HOMEPAGE_COPY: HomepageCopy = {
  board: {
    eyebrow: 'On the Board',
    title: "What's live tonight",
    subtitle: "Indoor, smalls, exotics, boxes — the menu that's actually on the shop right now.",
    ctaLabel: 'Shop the menu',
    ctaHref: '/shop',
  },
  categories: {
    title: 'THE SHOP',
    merchOnlyTitle: 'STUDIO MERCH',
    items: [
      { label: 'Flower', icon: 'fa-leaf', href: '/shop/flower' },
      { label: 'Vapes', icon: 'fa-bolt', href: '/shop/vaporizers' },
      { label: 'Concentrates', icon: 'fa-fire', href: '/shop/concentrates' },
      { label: 'Edibles', icon: 'fa-cookie', href: '/shop/edibles' },
      { label: 'Moonrocks', icon: 'fa-meteor', href: '/shop/moonrocks' },
      { label: 'Snowcaps', icon: 'fa-snowflake', href: '/shop/snowcaps' },
      { label: 'Studio Merch', icon: 'fa-shirt', href: '/shop/merch' },
    ],
  },
  vibes: {
    eyebrow: 'Kush World moods',
    title: 'How you trying to feel?',
  },
  touchdowns: {
    eyebrow: 'Touchdowns',
    title: 'Pack landings, paid',
    subtitle:
      'Post the TD with #KushWorldTD, paste the link on your account, get 500 loyalty points. Real posts — not a fake review count.',
    ctaLabel: 'Submit your TD',
    ctaHref: '/account',
    emptyTitle: "Board's waiting on the next landing",
    emptyBody:
      'Save your X username, drop #KushWorldTD on the post, then paste the URL under Account → TouchDown.',
    emptyCtaLabel: 'Get 500 points',
  },
  brands: {
    eyebrow: 'In the shop',
    title: 'Names we keep stocked',
  },
};

export const CUSTOM_BLOCK_META: Record<CustomBlockKind, { label: string; blurb: string }> = {
  text: { label: 'Text', blurb: 'Headline, body, and a button' },
  image: { label: 'Image banner', blurb: 'Full-width photo with optional words on top' },
  imageText: { label: 'Image + text', blurb: 'Photo beside copy, like a feature row' },
  video: { label: 'Video', blurb: 'Upload or paste a clip with optional copy' },
};

function isCustomBlockKind(value: unknown): value is CustomBlockKind {
  return value === 'text' || value === 'image' || value === 'imageText' || value === 'video';
}

export function isCustomHomepageSectionId(id: string): boolean {
  return id.startsWith(CUSTOM_SECTION_PREFIX);
}

export function mergeHomepageCopy(stored?: Partial<HomepageCopy> | null): HomepageCopy {
  const categories = stored?.categories;
  return {
    board: { ...DEFAULT_HOMEPAGE_COPY.board, ...(stored?.board || {}) },
    categories: {
      ...DEFAULT_HOMEPAGE_COPY.categories,
      ...(categories || {}),
      items:
        Array.isArray(categories?.items) && categories.items.length > 0
          ? categories.items
              .filter((item) => item && typeof item.label === 'string' && typeof item.href === 'string')
              .map((item) => ({
                label: item.label,
                icon: item.icon || 'fa-leaf',
                href: item.href,
              }))
          : DEFAULT_HOMEPAGE_COPY.categories.items,
    },
    vibes: { ...DEFAULT_HOMEPAGE_COPY.vibes, ...(stored?.vibes || {}) },
    touchdowns: { ...DEFAULT_HOMEPAGE_COPY.touchdowns, ...(stored?.touchdowns || {}) },
    brands: { ...DEFAULT_HOMEPAGE_COPY.brands, ...(stored?.brands || {}) },
  };
}

export function mergeHomepageBlocks(stored?: CustomHomepageBlock[] | null): CustomHomepageBlock[] {
  if (!Array.isArray(stored)) return [];
  const seen = new Set<string>();
  const next: CustomHomepageBlock[] = [];
  for (const item of stored) {
    if (!item || typeof item.id !== 'string' || !isCustomHomepageSectionId(item.id) || seen.has(item.id)) {
      continue;
    }
    if (!isCustomBlockKind(item.kind)) continue;
    seen.add(item.id);
    next.push({
      id: item.id,
      kind: item.kind,
      eyebrow: String(item.eyebrow || ''),
      title: String(item.title || ''),
      body: String(item.body || ''),
      imageUrl: String(item.imageUrl || ''),
      videoUrl: String(item.videoUrl || ''),
      ctaLabel: String(item.ctaLabel || ''),
      ctaHref: String(item.ctaHref || ''),
      imagePosition:
        item.imagePosition === 'left' ||
        item.imagePosition === 'right' ||
        item.imagePosition === 'background' ||
        item.imagePosition === 'top'
          ? item.imagePosition
          : item.kind === 'imageText'
            ? 'left'
            : 'top',
    });
  }
  return next;
}

export function createCustomHomepageBlock(kind: CustomBlockKind): CustomHomepageBlock {
  return {
    id: `${CUSTOM_SECTION_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    kind,
    eyebrow: '',
    title: kind === 'text' ? 'New section' : '',
    body: '',
    imageUrl: '',
    videoUrl: '',
    ctaLabel: '',
    ctaHref: '',
    imagePosition: kind === 'imageText' ? 'left' : kind === 'image' ? 'background' : 'top',
  };
}
