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

import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import ProductCollectionSection from './components/ProductCollectionSection';
import HowItWorksSection from './components/HowItWorksSection';
import CommunitySection from './components/CommunitySection';
import WishlistSync from './components/WishlistSync';
import { useAgeAccess } from '@/lib/useAgeAccess';
import { useSiteContent } from '@/lib/useSiteContent';
import type { ReviewCardData } from './components/ReviewCard';

interface HomeClientProps {
  initialReviews?: ReviewCardData[];
  initialReviewStats?: { count: number; average: number };
}

export default function HomeClient({ initialReviews, initialReviewStats }: HomeClientProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isMerchOnly } = useAgeAccess();
  const { content } = useSiteContent();
  const { features } = content;

  return (
    <>
      <WishlistSync />
      <Navbar onCartClick={() => setIsCartOpen(true)} />

      <main>
        <Hero merchOnly={isMerchOnly} />

        {!isMerchOnly && features.dropHero?.enabled && <DropHeroSection />}

        <Categories merchOnly={isMerchOnly} />

        {!isMerchOnly && <HomeVibeStrip />}

        {!isMerchOnly && features.newArrivals.enabled && (
          <ProductCollectionSection
            type="new-arrivals"
            title={features.newArrivals.title}
            subtitle={features.newArrivals.subtitle}
            ctaHref="/shop"
            ctaLabel="Shop New Arrivals"
            hempOnly
          />
        )}

        {!isMerchOnly && features.onSale.enabled && (
          <ProductCollectionSection
            type="on-sale"
            title="Fire sales"
            subtitle="Marked-down picks while they last."
            ctaHref="/shop"
            ctaLabel="Shop Deals"
            hempOnly
          />
        )}

        {!isMerchOnly && features.bestSellers.enabled && (
          <ProductCollectionSection
            type="best-sellers"
            title={features.bestSellers.title}
            subtitle={features.bestSellers.subtitle}
            ctaHref="/shop"
            ctaLabel="Shop Best Sellers"
            hempOnly
          />
        )}

        {!isMerchOnly && <BrandRowSection />}

        {features.howItWorks.enabled && (
          <HowItWorksSection title={features.howItWorks.title} steps={features.howItWorks.steps} />
        )}

        {features.merchSection.enabled && <MerchSection />}

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
