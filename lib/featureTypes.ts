export interface FeatureToggle {
  enabled: boolean;
}

/** Customer-facing checkout copy for a payment method */
export interface CheckoutPaymentConfig extends FeatureToggle {
  /** Button label on checkout */
  label: string;
  /** Subtitle under the payment button */
  subtitle?: string;
  /** Detail panel heading (manual payments) */
  payToLabel?: string;
  /** Detail panel value shown to customer (manual payments) */
  payToValue?: string;
  /** Optional extra instructions below pay-to info */
  instructions?: string;
}

export interface HowItWorksStep {
  icon: string;
  title: string;
  body: string;
}

export interface SiteFeatures {
  bestSellers: FeatureToggle & {
    title: string;
    subtitle: string;
    limit: number;
    pinnedProductIds: string[];
  };
  newArrivals: FeatureToggle & {
    title: string;
    subtitle: string;
    limit: number;
  };
  onSale: FeatureToggle & {
    title: string;
    subtitle: string;
    limit: number;
    showBadge: boolean;
  };
  howItWorks: FeatureToggle & {
    title: string;
    steps: HowItWorksStep[];
  };
  communityBlock: FeatureToggle & {
    title: string;
    body: string;
  };
  merchSection: FeatureToggle;
  reviewsSection: FeatureToggle;
  loyaltySection: FeatureToggle;
  faqSection: FeatureToggle;
  wishlist: FeatureToggle;
  coaLinks: FeatureToggle;
  productSearch: FeatureToggle;
  starRatings: FeatureToggle;
  loyaltyProgram: FeatureToggle;
  spinWheel: FeatureToggle & { spinCost: number };
  referrals: FeatureToggle;
  customerReviews: FeatureToggle & {
    requirePurchase: boolean;
    rewardPoints: number;
  };
  ageGate: FeatureToggle;
  idVerification: FeatureToggle;
  paymentCard: CheckoutPaymentConfig;
  paymentBitcoin: CheckoutPaymentConfig & {
    /** Optional YouTube URL for “how to send BTC” (Cash App, etc.) */
    guideYoutubeUrl?: string;
    /** BTC detail panel title */
    detailTitle?: string;
    /** BTC detail panel body copy */
    detailBody?: string;
  };
  paymentZelle: CheckoutPaymentConfig;
  paymentPaypal: CheckoutPaymentConfig;
  paymentChime: CheckoutPaymentConfig;
  auctions: FeatureToggle;
  raffles: FeatureToggle;
  mysteryBoxes: FeatureToggle;
  grokAssistant: FeatureToggle;
}

export const DEFAULT_SITE_FEATURES: SiteFeatures = {
  bestSellers: {
    enabled: true,
    title: 'Best Sellers',
    subtitle: 'Top picks from the Kush World catalog.',
    limit: 8,
    pinnedProductIds: [],
  },
  newArrivals: {
    enabled: true,
    title: 'New Arrivals',
    subtitle: 'Fresh drops and latest additions.',
    limit: 8,
  },
  onSale: {
    enabled: true,
    title: 'On Sale',
    subtitle: 'Limited-time deals across the shop.',
    limit: 8,
    showBadge: true,
  },
  howItWorks: {
    enabled: true,
    title: 'How It Works',
    steps: [
      { icon: '🛒', title: 'Shop', body: 'Browse lab-tested hemp and studio merch.' },
      { icon: '💳', title: 'Checkout', body: 'Pay securely with card, crypto, or manual options.' },
      { icon: '📦', title: 'We Ship', body: 'Orders process in 1–3 business days, discreet packaging.' },
      { icon: '✅', title: 'Enjoy', body: 'Track your order and earn loyalty rewards.' },
    ],
  },
  communityBlock: {
    enabled: true,
    title: 'Join the Kush World Community',
    body: 'Get restock alerts, deals, and drops on Telegram, Discord, and social.',
  },
  merchSection: { enabled: false },
  reviewsSection: { enabled: true },
  loyaltySection: { enabled: true },
  faqSection: { enabled: true },
  wishlist: { enabled: true },
  coaLinks: { enabled: true },
  productSearch: { enabled: true },
  starRatings: { enabled: true },
  loyaltyProgram: { enabled: true },
  spinWheel: { enabled: true, spinCost: 150 },
  referrals: { enabled: true },
  customerReviews: { enabled: true, requirePurchase: false, rewardPoints: 25 },
  ageGate: { enabled: true },
  idVerification: { enabled: true },
  paymentCard: {
    enabled: true,
    label: 'Credit / Debit Card',
    subtitle: 'Secure checkout via Authorize.net',
  },
  paymentBitcoin: {
    enabled: true,
    label: 'Bitcoin (BTC)',
    subtitle: 'Scan QR · live rate · auto-detected',
    guideYoutubeUrl: 'https://www.youtube.com/results?search_query=how+to+send+bitcoin+cash+app',
    detailTitle: 'Pay with Bitcoin only',
    detailBody:
      "After you place the order, you'll get a QR code and exact BTC amount. Most customers use Cash App — payment is detected automatically on the blockchain.",
  },
  paymentZelle: {
    enabled: true,
    label: 'Zelle',
    payToLabel: 'Send Zelle payment to:',
    payToValue: 'kushworldshop@gmail.com',
  },
  paymentPaypal: {
    enabled: true,
    label: 'PayPal',
    payToLabel: 'PayPal Friends & Family:',
    payToValue: '@kushworldshop',
  },
  paymentChime: {
    enabled: true,
    label: 'Chime',
    payToLabel: 'Chime payment to:',
    payToValue: '$KushWorldShop',
  },
  auctions: { enabled: false },
  raffles: { enabled: false },
  mysteryBoxes: { enabled: false },
  grokAssistant: { enabled: true },
};

export type FeaturePatch = {
  [K in keyof SiteFeatures]?: Partial<SiteFeatures[K]>;
};

export function mergeSiteFeatures(partial?: FeaturePatch): SiteFeatures {
  if (!partial) return { ...DEFAULT_SITE_FEATURES };
  const merged: SiteFeatures = { ...DEFAULT_SITE_FEATURES };
  for (const key of Object.keys(DEFAULT_SITE_FEATURES) as (keyof SiteFeatures)[]) {
    const value = partial[key];
    if (value !== undefined) {
      Object.assign(merged[key], value);
    }
  }
  return merged;
}

export function isFeatureEnabled(
  features: SiteFeatures | undefined,
  key: keyof SiteFeatures
): boolean {
  return features?.[key]?.enabled ?? DEFAULT_SITE_FEATURES[key].enabled;
}