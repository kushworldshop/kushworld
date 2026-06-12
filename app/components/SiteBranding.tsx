'use client';

import { useEffect } from 'react';
import { useSiteContent } from '@/lib/useSiteContent';

export default function SiteBranding() {
  const { content } = useSiteContent();

  useEffect(() => {
    const heroUrl = content.brand.heroBackgroundUrl || content.brand.logoUrl;
    document.documentElement.style.setProperty('--hero-bg-url', `url('${heroUrl}')`);
    document.documentElement.style.setProperty('--brand-accent', content.brand.accentColor || '#00ff9d');
  }, [content.brand.heroBackgroundUrl, content.brand.logoUrl, content.brand.accentColor]);

  return null;
}