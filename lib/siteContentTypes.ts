export interface HeroVariant {
  eyebrow: string;
  headline: string;
  subtitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel?: string;
  badges: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface LoyaltyCard {
  icon: string;
  title: string;
  body: string;
}

export interface PolicyPage {
  title: string;
  body: string;
}

export type { ShopNavigation, ShopCategory, ShopSubsection } from '@/lib/shopNavigation';
export type { SiteFeatures, HowItWorksStep } from '@/lib/featureTypes';
import { DEFAULT_SITE_FEATURES, type SiteFeatures } from '@/lib/featureTypes';

export interface SiteContent {
  updatedAt: string;
  brand: {
    name: string;
    tagline: string;
    logoUrl: string;
    heroBackgroundUrl: string;
    accentColor: string;
  };
  announcementBar: {
    enabled: boolean;
    fullAccess: string;
    merchOnly: string;
  };
  hero: {
    fullAccess: HeroVariant;
    merchOnly: HeroVariant;
  };
  footer: {
    tagline: string;
    copyright: string;
  };
  contact: {
    email: string;
    responseTime: string;
    pageTitle: string;
    pageSubtitle: string;
    formSuccessMessage: string;
  };
  social: {
    twitterUrl: string;
    twitterHandle: string;
    studioUrl: string;
    discordUrl: string;
    tiktokUrl: string;
    facebookUrl: string;
    whatsappUrl: string;
    instagramUrl: string;
    twitchUrl: string;
    linktreeUrl: string;
  };
  merchSection: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    studioLinkLabel: string;
  };
  loyaltySection: {
    title: string;
    subtitle: string;
    cards: LoyaltyCard[];
    ctaLabel: string;
  };
  reviewsSection: {
    eyebrow: string;
    title: string;
    ctaLabel: string;
    socialCtaLabel: string;
  };
  faq: {
    title: string;
    subtitle: string;
    items: FaqItem[];
    footerNote: string;
  };
  ageGate: {
    title: string;
    body: string;
    confirmLabel: string;
    merchOnlyLabel: string;
  };
  shipping: {
    freeShippingThresholdHemp: number;
    freeShippingThresholdMerch: number;
  };
  policies: {
    privacy: PolicyPage;
    terms: PolicyPage;
    shipping: PolicyPage;
    returns: PolicyPage;
  };
  shopNavigation: import('@/lib/shopNavigation').ShopNavigation;
  features: SiteFeatures;
}

import { DEFAULT_SHOP_NAVIGATION } from '@/lib/shopNavigation';
import { DISCORD_INVITE_URL } from '@/lib/discordInvite';

export const DEFAULT_SITE_CONTENT: SiteContent = {
  updatedAt: new Date().toISOString(),
  brand: {
    name: 'Kush World',
    tagline: 'Premium Hemp, Studio Merch & Lab-Tested Products',
    logoUrl: '/logo.png',
    heroBackgroundUrl: '/logo.png',
    accentColor: '#00ff9d',
  },
  announcementBar: {
    enabled: true,
    fullAccess: '👕 Studio merch now in shop • Lab-tested hemp • Discreet shipping nationwide',
    merchOnly: '👕 Studio merch — Custom made to order',
  },
  hero: {
    fullAccess: {
      eyebrow: 'Kush World',
      headline: 'Premium Goods,\nDelivered Right',
      subtitle:
        'Lab-tested hemp products and official Kush World Studio merch. Discreet shipping nationwide.',
      primaryCtaLabel: 'Shop Merch',
      secondaryCtaLabel: 'Full Catalog',
      badges: ['Lab Tested + COAs', 'Free Shipping $200+', '21+ Only'],
    },
    merchOnly: {
      eyebrow: 'Kush World Studio',
      headline: 'Official\nStudio Merch',
      subtitle: 'Custom apparel and accessories from Kush World Studio.',
      primaryCtaLabel: 'Shop Merch',
      badges: ['Custom Made', 'Studio Quality', 'Made to Order'],
    },
  },
  footer: {
    tagline:
      'Lab-tested hemp vapes, concentrates, flower, and official Kush World Studio merch. COAs on every product. Discreet shipping. 21+ only.',
    copyright: '© 2026 Kush World. 21+ only.',
  },
  contact: {
    email: 'kushworldshop@gmail.com',
    responseTime: '24–48 hours',
    pageTitle: 'Contact Us',
    pageSubtitle: 'Questions about orders, COAs, or wholesale? Reach out.',
    formSuccessMessage: "Message received! We'll get back to you soon.",
  },
  social: {
    twitterUrl: 'https://x.com/kushworld',
    twitterHandle: '@kushworld',
    studioUrl: 'https://kushworldstudio.co',
    discordUrl: DISCORD_INVITE_URL,
    tiktokUrl: 'https://www.tiktok.com/@kushwrldshop',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61585255765095&mibextid=wwXIfr',
    whatsappUrl: 'https://wa.me/15627724106',
    instagramUrl: 'https://www.instagram.com/kushworldllc',
    twitchUrl: 'https://www.twitch.tv/kushworldshop',
    linktreeUrl: 'https://linktr.ee/kushworldllc',
  },
  merchSection: {
    eyebrow: 'Kush World Studio',
    title: 'Official Merch',
    subtitle: 'A curated pick from our studio line — hoodies, tees, hats, and more.',
    ctaLabel: 'View All Merch',
    studioLinkLabel: 'Visit kushworldstudio.co →',
  },
  loyaltySection: {
    title: 'Kush World Rewards',
    subtitle:
      'Stack points on every order, share your referral link, and unlock discounts and perks along the way.',
    cards: [
      {
        icon: '💰',
        title: 'Earn Points',
        body: '1 point per $10 spent when logged in. Refer friends for bonus points.',
      },
      {
        icon: '🎁',
        title: 'First Order Bonus',
        body: 'Free 8th or $20 off + free shipping on qualifying orders',
      },
      {
        icon: '👥',
        title: 'Refer & Earn',
        body: 'Share your link. Both you and your friend get rewards.',
      },
    ],
    ctaLabel: 'GET YOUR REFERRAL LINK',
  },
  reviewsSection: {
    eyebrow: 'Verified Trusted Source',
    title: 'What People Are Saying',
    ctaLabel: 'See All Reviews',
    socialCtaLabel: 'Follow @kushworld',
  },
  faq: {
    title: 'Frequently Asked Questions',
    subtitle: 'Everything you need to know about shopping at Kush World.',
    items: [
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
    ],
    footerNote: 'More questions? Contact us or browse our lab COAs.',
  },
  ageGate: {
    title: '21+ Age Verification',
    body: "Hemp products require you to be 21+. If you're under 21, you can still shop official Kush World Studio merch.",
    confirmLabel: 'Yes, I am 21+',
    merchOnlyLabel: 'No — shop merch only',
  },
  shipping: {
    freeShippingThresholdHemp: 200,
    freeShippingThresholdMerch: 100,
  },
  policies: {
    privacy: {
      title: 'Privacy Policy',
      body: `Kush World respects your privacy. This policy explains how we collect and use your information.

## Information We Collect
Name, email, shipping address, and phone for order fulfillment. Government ID images for 21+ age verification (new customers). Payment information processed securely via Authorize.net (we never store card numbers).

## How We Use Your Data
Order processing, age verification, shipping, and customer support. We do not sell your personal information.

## ID Verification
ID images are stored securely on our server and used solely for age verification. Only authorized admin staff can access them.

## Contact
Questions? Email kushworldshop@gmail.com`,
    },
    terms: {
      title: 'Terms of Use',
      body: `By using Kush World you agree to these terms. You must be 21+ to purchase hemp products.

## Orders
All orders are subject to availability. Minimum order $25. We reserve the right to refuse or cancel orders.

## Age Verification
Hemp product purchases require valid 21+ verification. Providing false information may result in order cancellation.

## Contact
Questions? Email kushworldshop@gmail.com`,
    },
    shipping: {
      title: 'Shipping Policy',
      body: `Kush World ships discreetly across the United States.

## Rates
Flat rate $9.99 on hemp orders under $200. Free shipping on hemp orders $200+. Studio merch ships free on orders $100+.

## Processing
Orders typically process within 1–3 business days. Delivery takes 3–7 business days depending on carrier and location.

## Restricted States
Some states are restricted for hemp products. See our Delivery Zones page for details.`,
    },
    returns: {
      title: 'Returns & Refunds',
      body: `We want you to be satisfied with your Kush World order.

## Eligibility
Contact us within 7 days of delivery for defective or incorrect items. Hemp products cannot be returned once opened due to regulations.

## Process
Email kushworldshop@gmail.com with your order number and photos. Approved returns receive store credit or replacement.

## Contact
Questions? Email kushworldshop@gmail.com`,
    },
  },
  shopNavigation: DEFAULT_SHOP_NAVIGATION,
  features: DEFAULT_SITE_FEATURES,
};

export function splitHeadline(headline: string): string[] {
  return headline.split('\n').filter(Boolean);
}