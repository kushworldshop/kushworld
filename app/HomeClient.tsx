'use client';

import { useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import LoyaltySection from './components/LoyaltySection';
import ReviewsSection from './components/ReviewsSection';
import SeoFaq from './components/SeoFaq';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import ProductCollectionSection from './components/ProductCollectionSection';
import HowItWorksSection from './components/HowItWorksSection';
import CommunitySection from './components/CommunitySection';
import { useAgeAccess } from '@/lib/useAgeAccess';
import { useSiteContent } from '@/lib/useSiteContent';

export default function HomeClient() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { isMerchOnly } = useAgeAccess();
  const { content } = useSiteContent();
  const { features } = content;

  return (
    <>
      <Navbar onCartClick={() => setIsCartOpen(true)} />

      <main>
        <Hero merchOnly={isMerchOnly} />

        {features.bestSellers.enabled && (
          <ProductCollectionSection
            type="best-sellers"
            title={features.bestSellers.title}
            subtitle={features.bestSellers.subtitle}
            ctaHref="/shop"
            ctaLabel="Shop Best Sellers"
          />
        )}

        {features.newArrivals.enabled && (
          <ProductCollectionSection
            type="new-arrivals"
            title={features.newArrivals.title}
            subtitle={features.newArrivals.subtitle}
            ctaHref="/shop"
            ctaLabel="See What's New"
          />
        )}

        {features.onSale.enabled && (
          <ProductCollectionSection
            type="on-sale"
            title={features.onSale.title}
            subtitle={features.onSale.subtitle}
            ctaHref="/shop"
            ctaLabel="Shop Deals"
          />
        )}

        {features.howItWorks.enabled && (
          <HowItWorksSection title={features.howItWorks.title} steps={features.howItWorks.steps} />
        )}

        {features.reviewsSection.enabled && <ReviewsSection />}

        {features.communityBlock.enabled && (
          <CommunitySection
            title={features.communityBlock.title}
            body={features.communityBlock.body}
          />
        )}

        {features.faqSection.enabled && <SeoFaq />}

        {!isMerchOnly && features.loyaltySection.enabled && <LoyaltySection />}
      </main>

      <Footer />

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}