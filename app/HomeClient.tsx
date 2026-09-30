'use client';

import { useState, type ReactNode } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LoyaltySection from './components/LoyaltySection';
import ReviewsSection from './components/ReviewsSection';
import MerchSection from './components/MerchSection';
import DropHeroSection from './components/DropHeroSection';
import Categories from './components/Categories';
import BrandRowSection from './components/BrandRowSection';
import HomeVibeStrip from './components/HomeVibeStrip';
import BoardSection from './components/BoardSection';
import TouchdownWall from './components/TouchdownWall';

import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import HowItWorksSection from './components/HowItWorksSection';
import CommunitySection from './components/CommunitySection';
import ProductCollectionSection from './components/ProductCollectionSection';
import SeoFaq from './components/SeoFaq';
import WishlistSync from './components/WishlistSync';
import { useAgeAccess } from '@/lib/useAgeAccess';
import { useSiteContent } from '@/lib/useSiteContent';
import {
  isHempHomepageSection,
  mergeHomepageLayout,
  type HomepageSection,
} from '@/lib/homepageLayout';
import type { ReviewCardData } from './components/ReviewCard';
import type { Product } from '@/lib/products';
import type { PublicTdPost } from '@/lib/tdRewards';
import type { SiteFeatures } from '@/lib/featureTypes';

interface HomeClientProps {
  initialReviews?: ReviewCardData[];
  initialReviewStats?: { count: number; average: number };
  boardProducts?: Product[];
  dropProduct?: Product | null;
  dropHero?: SiteFeatures['dropHero'] | null;
  homepageLayout?: { sections: HomepageSection[] } | null;
  merchProducts?: Product[];
  tdPosts?: PublicTdPost[];
}

export default function HomeClient({
  initialReviews,
  initialReviewStats,
  boardProducts = [],
  dropProduct = null,
  dropHero = null,
  homepageLayout = null,
  merchProducts = [],
  tdPosts = [],
}: HomeClientProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isMerchOnly } = useAgeAccess();
  const { content, ready } = useSiteContent();
  const { features } = content;
  const drop = (ready ? features.dropHero : dropHero) ?? features.dropHero;
  const sections = mergeHomepageLayout(
    (ready ? content.homepageLayout?.sections : homepageLayout?.sections) ??
      content.homepageLayout?.sections,
    features
  );

  const renderSection = (id: (typeof sections)[number]['id']): ReactNode => {
    switch (id) {
      case 'hero':
        return <Hero merchOnly={isMerchOnly} />;
      case 'board':
        return <BoardSection products={boardProducts} />;
      case 'drop':
        return drop?.enabled ? (
          <DropHeroSection initialProduct={dropProduct} initialDrop={drop} />
        ) : null;
      case 'categories':
        return <Categories merchOnly={isMerchOnly} />;
      case 'vibes':
        return <HomeVibeStrip />;
      case 'touchdowns':
        return <TouchdownWall posts={tdPosts} />;
      case 'brands':
        return <BrandRowSection />;
      case 'bestSellers':
        return (
          <ProductCollectionSection
            type="best-sellers"
            title={features.bestSellers.title}
            subtitle={features.bestSellers.subtitle}
            hempOnly={!isMerchOnly}
          />
        );
      case 'newArrivals':
        return (
          <ProductCollectionSection
            type="new-arrivals"
            title={features.newArrivals.title}
            subtitle={features.newArrivals.subtitle}
            hempOnly={!isMerchOnly}
          />
        );
      case 'onSale':
        return (
          <ProductCollectionSection
            type="on-sale"
            title={features.onSale.title}
            subtitle={features.onSale.subtitle}
            hempOnly={!isMerchOnly}
          />
        );
      case 'howItWorks':
        return <HowItWorksSection title={features.howItWorks.title} steps={features.howItWorks.steps} />;
      case 'merch':
        return <MerchSection initialProducts={merchProducts} />;
      case 'reviews':
        return <ReviewsSection initialReviews={initialReviews} initialStats={initialReviewStats} />;
      case 'community':
        return <CommunitySection title={features.communityBlock.title} body={features.communityBlock.body} />;
      case 'loyalty':
        return <LoyaltySection />;
      case 'faq':
        return <SeoFaq />;
      default:
        return null;
    }
  };

  return (
    <>
      <WishlistSync />
      <Navbar onCartClick={() => setIsCartOpen(true)} />

      <main>
        {sections.map((section) => {
          if (!section.enabled) return null;
          if (isMerchOnly && isHempHomepageSection(section.id)) return null;
          const node = renderSection(section.id);
          return node ? <div key={section.id}>{node}</div> : null;
        })}
      </main>

      <Footer />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
