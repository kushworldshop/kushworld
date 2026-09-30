'use client';

import { useState } from 'react';
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
import WishlistSync from './components/WishlistSync';
import { useAgeAccess } from '@/lib/useAgeAccess';
import { useSiteContent } from '@/lib/useSiteContent';
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
  merchProducts?: Product[];
  tdPosts?: PublicTdPost[];
}

export default function HomeClient({
  initialReviews,
  initialReviewStats,
  boardProducts = [],
  dropProduct = null,
  dropHero = null,
  merchProducts = [],
  tdPosts = [],
}: HomeClientProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isMerchOnly } = useAgeAccess();
  const { content, ready } = useSiteContent();
  const { features } = content;
  const drop = (ready ? features.dropHero : dropHero) ?? features.dropHero;

  return (
    <>
      <WishlistSync />
      <Navbar onCartClick={() => setIsCartOpen(true)} />

      <main>
        <Hero merchOnly={isMerchOnly} />

        {!isMerchOnly && <BoardSection products={boardProducts} />}

        {!isMerchOnly && drop?.enabled && (
          <DropHeroSection initialProduct={dropProduct} initialDrop={drop} />
        )}

        <Categories merchOnly={isMerchOnly} />

        {!isMerchOnly && <HomeVibeStrip />}

        {!isMerchOnly && <TouchdownWall posts={tdPosts} />}

        {!isMerchOnly && <BrandRowSection />}

        {features.howItWorks.enabled && (
          <HowItWorksSection title={features.howItWorks.title} steps={features.howItWorks.steps} />
        )}

        {features.merchSection.enabled && <MerchSection initialProducts={merchProducts} />}

        {features.reviewsSection.enabled && (
          <ReviewsSection initialReviews={initialReviews} initialStats={initialReviewStats} />
        )}

        {features.communityBlock.enabled && (
          <CommunitySection
            title={features.communityBlock.title}
            body={features.communityBlock.body}
          />
        )}

        {!isMerchOnly && features.loyaltySection.enabled && <LoyaltySection />}
      </main>

      <Footer />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
