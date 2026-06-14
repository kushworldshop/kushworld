import type { MetadataRoute } from 'next';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'Kush World',
    description: SITE_TAGLINE,
    start_url: SITE_URL,
    // 'standalone' + shortcuts disabled: public install-as-app not ready (full code kept in this file for future launch)
    display: 'browser',
    // display_override: ['standalone', 'minimal-ui'],
    background_color: '#000000',
    theme_color: '#00ff9d',
    // orientation: 'portrait',
    // categories: ['shopping', 'lifestyle', 'health'],
    lang: 'en',
    scope: SITE_URL,
    icons: [
      { src: '/logo.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // shortcuts: [ {Shop}, {My Account} ],  // restored on app launch
    // Note: Add real screenshots in public/screenshots/ for full app store readiness
    // screenshots: [
    //   { src: '/screenshots/mobile-home.png', sizes: '540x720', type: 'image/png', form_factor: 'narrow' },
    // ],
  };
}