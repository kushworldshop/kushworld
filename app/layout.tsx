import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Inter } from 'next/font/google';
import AgeGateProvider from './components/AgeGateProvider';
import JsonLd from './components/JsonLd';
import { buildPageMetadata, organizationJsonLd, SITE_TAGLINE } from '@/lib/seo';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Kush World | Premium Hemp & Studio Merch',
    description: SITE_TAGLINE,
    path: '/',
  }),
  title: {
    default: 'Kush World | Premium Hemp & Studio Merch',
    template: '%s | Kush World',
  },
  applicationName: 'Kush World',
  category: 'shopping',
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: [{ url: '/logo.png', type: 'image/png' }],
    shortcut: ['/logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`bg-black text-white ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="font-sans antialiased">
        <JsonLd data={organizationJsonLd()} />
        <AgeGateProvider>{children}</AgeGateProvider>
        <Analytics />
      </body>
    </html>
  );
}