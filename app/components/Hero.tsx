'use client';

import Link from 'next/link';
import BrandLogoLink from '@/app/components/BrandLogoLink';
import { splitHeadline } from '@/lib/siteContentTypes';
import { useSiteContent } from '@/lib/useSiteContent';

export default function Hero({ merchOnly = false }: { merchOnly?: boolean }) {
  const { content } = useSiteContent();
  const variant = merchOnly ? content.hero.merchOnly : content.hero.fullAccess;
  const headlineLines = splitHeadline(variant.headline);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-black overflow-hidden">
      {/* Subtle background effect if you want */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black opacity-90"></div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Animated Mascot Video - Centered, No White Borders */}
        <div className="flex justify-center mb-8">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full max-w-[420px] md:max-w-[520px] h-auto rounded-3xl border-4 border-black shadow-2xl"
          >
            <source src="/mascot-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Optional Tagline Below Logo */}
        <p className="text-[#00ff9d] text-xl md:text-2xl font-medium tracking-widest mt-4">
          PREMIUM GOODS • DISCREET DELIVERY
        </p>


      </div>
    </section>
  );
}