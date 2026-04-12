import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KUSH WORLD | Premium Head Shop',
  description: 'Elevate your experience with premium merch, glass & hemp goods. 21+ only.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-black text-white">
      <body>{children}</body>
    </html>
  );
}