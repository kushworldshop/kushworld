import type { Metadata } from 'next';
import type { Product } from '@/lib/products';
import { getProductSlug, getProductDescription } from '@/lib/products';
import type { Review } from '@/lib/reviews';
import { DISCORD_INVITE_URL } from '@/lib/discordInvite';

export const SITE_URL = 'https://kushworld.shop';
export const SITE_NAME = 'Kush World';
export const SITE_TAGLINE = 'Premium Hemp, Studio Merch & Lab-Tested Products';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

export const ORGANIZATION = {
  name: SITE_NAME,
  legalName: 'Kush World',
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  email: 'kushworldshop@gmail.com',
  sameAs: [
    DISCORD_INVITE_URL,
    'https://kushworldstudio.co',
    'https://x.com/kushworld',
    'https://www.tiktok.com/@kushwrldshop',
    'https://www.facebook.com/profile.php?id=61585255765095&mibextid=wwXIfr',
    'https://wa.me/15627724106',
    'https://www.instagram.com/kushworldllc',
    'https://www.twitch.tv/kushworldshop',
    'https://linktr.ee/kushworldllc',
  ],
};

export const DEFAULT_KEYWORDS = [
  'Kush World',
  'kushworld shop',
  'hemp products online',
  'lab tested hemp',
  'hemp COA',
  'disposable vapes',
  'hemp concentrates',
  'exotic flower',
  'Kush World Studio merch',
  'hemp apparel',
  'head shop online',
  'hemp delivery',
  'legal hemp products',
];

export const CATEGORY_SEO: Record<
  string,
  { title: string; description: string; keywords: string[] }
> = {
  merch: {
    title: 'Kush World Studio Merch — Hoodies, Tees, Hats & Apparel',
    description:
      'Shop official Kush World Studio merch. Custom hoodies, t-shirts, snapbacks, beanies, and accessories. Free shipping on orders $100+. Made to order.',
    keywords: ['Kush World merch', 'hemp apparel', 'hemp brand clothing', 'studio hoodie', 'Kush World hat'],
  },
  vapes: {
    title: 'Hemp Vapes & Disposables — Lab-Tested | Kush World',
    description:
      'Premium hemp disposable vapes with third-party lab COAs. Discreet nationwide shipping. Authentic brands, verified potency. 21+ only.',
    keywords: ['hemp vapes', 'disposable vape', 'lab tested vape', 'hemp disposable', 'THC vape COA'],
  },
  concentrates: {
    title: 'Hemp Concentrates — Crumble, Badder & Sugar | Kush World',
    description:
      'High-quality hemp concentrates with full COA documentation. Crumble, badder, sugar, and more. Discreet insured shipping. 21+ only.',
    keywords: ['hemp concentrates', 'hemp crumble', 'hemp badder', 'lab tested concentrate', 'COA concentrate'],
  },
  flower: {
    title: 'Exotic Hemp Flower — Lab-Tested Strains | Kush World',
    description:
      'Hand-selected exotic hemp flower strains. Every batch lab-tested with COA available. Discreet shipping nationwide. 21+ only.',
    keywords: ['exotic hemp flower', 'hemp flower online', 'lab tested flower', 'hemp strain COA'],
  },
  mushrooms: {
    title: 'Premium Mushroom Products — Lab Verified | Kush World',
    description:
      'Lab-verified mushroom products from Kush World. Third-party tested. Discreet shipping. Adults 21+ only.',
    keywords: ['mushroom products', 'lab tested mushrooms', 'Kush World mushrooms'],
  },
};

const NOINDEX_ROUTES = new Set(['/account', '/checkout', '/cart', '/admin', '/wishlist']);

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function truncateDescription(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3).trim()}...`;
}

export function getSeoDescription(product: Product): string {
  const raw = getProductDescription(product);
  const categoryHint =
    product.category === 'merch'
      ? `Official Kush World Studio ${product.merchSubcategory || 'merch'}.`
      : `Lab-tested ${product.category} with COA available.`;
  return truncateDescription(`${product.name} — ${categoryHint} ${raw}`);
}

export function buildPageMetadata({
  title,
  description,
  path = '/',
  keywords = [],
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
  type = 'website' as const,
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
  type?: 'website' | 'article';
}): Metadata {
  const url = absoluteUrl(path);
  const allKeywords = [...new Set([...DEFAULT_KEYWORDS, ...keywords])];

  return {
    title,
    description,
    keywords: allKeywords,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
      locale: 'en_US',
      images: [{ url: image.startsWith('http') ? image : absoluteUrl(image), width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.startsWith('http') ? image : absoluteUrl(image)],
      creator: '@kushworld',
      site: '@kushworld',
    },
  };
}

export function isNoIndexPath(path: string): boolean {
  return NOINDEX_ROUTES.has(path);
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORGANIZATION.name,
    legalName: ORGANIZATION.legalName,
    url: ORGANIZATION.url,
    logo: ORGANIZATION.logo,
    email: ORGANIZATION.email,
    sameAs: ORGANIZATION.sameAs,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function onlineStoreJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE_NAME,
    url: SITE_URL,
    image: DEFAULT_OG_IMAGE,
    description: SITE_TAGLINE,
    email: ORGANIZATION.email,
    priceRange: '$6–$800',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Credit Card, PayPal, Zelle, Bitcoin',
    areaServed: 'US',
  };
}

export function productJsonLd(
  product: Product,
  reviewData?: { average: number; count: number; reviews?: Review[] }
) {
  const slug = getProductSlug(product);
  const url = absoluteUrl(`/products/${slug}`);
  const image = product.image.startsWith('http') ? product.image : absoluteUrl(product.image);
  const categoryName =
    CATEGORY_SEO[product.category]?.title.split('—')[0].trim() || product.category;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: getSeoDescription(product),
    image: product.images?.map((img) => (img.startsWith('http') ? img : absoluteUrl(img))) ?? [image],
    url,
    sku: product.id,
    brand: { '@type': 'Brand', name: product.category === 'merch' ? 'Kush World Studio' : SITE_NAME },
    category: categoryName,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price: product.price,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };

  if (reviewData && reviewData.count > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviewData.average,
      reviewCount: reviewData.count,
    };
    if (reviewData.reviews && reviewData.reviews.length > 0) {
      jsonLd.review = reviewData.reviews.slice(0, 3).map((r) => ({
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating,
        },
        author: {
          '@type': 'Person',
          name: r.author || 'Customer',
        },
        reviewBody: (r.comment || '').slice(0, 200),
      }));
    }
  }

  return jsonLd;
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

export const HOME_FAQS = [
  {
    question: 'Does Kush World lab test its products?',
    answer:
      'Yes. Hemp products on Kush World include third-party lab Certificates of Analysis (COAs) so you can verify potency and purity before you buy.',
  },
  {
    question: 'Does Kush World ship nationwide?',
    answer:
      'Kush World ships discreetly across the United States. Some states are restricted — see our Delivery Zones page for details. Free shipping on hemp orders $200+ and studio merch $100+.',
  },
  {
    question: 'What is Kush World Studio merch?',
    answer:
      'Kush World Studio is our official apparel line — hoodies, t-shirts, hats, mugs, and accessories featuring Kush World designs. Items are custom made to order.',
  },
  {
    question: 'Do I need to be 21+ to shop Kush World?',
    answer:
      'You must be 21 or older to purchase hemp products. New customers may need to upload ID for verification. Studio merch is available without age-restricted product access.',
  },
];

export const PUBLIC_PAGES: {
  path: string;
  priority: number;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/shop', priority: 0.95, changeFrequency: 'daily' },
  { path: '/shop/merch', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/shop/vaporizers', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/shop/concentrates', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/shop/flower', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/shop/edibles', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/shop/pre-rolls', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/shop/accessories', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/shop/mushrooms', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/reviews', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/coa', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/referral', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/wholesale', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/delivery-zones', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/pay-with-bitcoin', priority: 0.65, changeFrequency: 'monthly' },
  { path: '/shipping-policy', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/returns', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/privacy-policy', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.4, changeFrequency: 'yearly' },
];