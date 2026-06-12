import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AgeGateProvider from './components/AgeGateProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://kushworld.shop'),
  title: 'KUSH WORLD | Premium Head Shop',
  description: 'Premium merch, glass & hemp goods from Kush World. Lab-tested with COAs. Discreet shipping. 21+ only.',
  openGraph: {
    title: 'KUSH WORLD',
    description: 'Premium lab-tested products. Discreet shipping. 21+ only.',
    siteName: 'Kush World',
    type: 'website',
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
        <AgeGateProvider>{children}</AgeGateProvider>
      </body>
    </html>
  );
}