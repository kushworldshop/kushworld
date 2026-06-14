'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BrandLogoLink({
  children,
  className = '',
  overlay = false,
}: {
  children?: React.ReactNode;
  className?: string;
  /** Invisible hit area over the hero background logo */
  overlay?: boolean;
}) {
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (overlay) {
    return (
      <Link
        href="/"
        onClick={handleClick}
        aria-label="Go to homepage"
        className={`absolute left-1/2 top-[8%] z-[30] h-[38vh] w-[min(85vw,480px)] -translate-x-1/2 cursor-pointer ${className}`}
      />
    );
  }

  return (
    <Link href="/" onClick={handleClick} className={className} aria-label="Go to homepage">
      {children}
    </Link>
  );
}