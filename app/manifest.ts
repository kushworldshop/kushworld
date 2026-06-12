import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'Kush World',
    description: SITE_TAGLINE,
    start_url: SITE_URL,
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#00ff9d',
    icons: [
      { src: '/logo.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}