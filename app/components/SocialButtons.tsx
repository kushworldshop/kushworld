'use client';

import { useSiteContent } from '@/lib/useSiteContent';
import { getActiveSocialLinks } from '@/lib/socialLinks';

interface SocialButtonsProps {
  size?: 'sm' | 'md';
  className?: string;
}

export default function SocialButtons({ size = 'md', className = '' }: SocialButtonsProps) {
  const { content } = useSiteContent();
  const links = getActiveSocialLinks(content.social);

  if (links.length === 0) return null;

  const buttonSize = size === 'sm' ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-base';

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {links.map((link) => (
        <a
          key={link.key}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          className={`${buttonSize} inline-flex items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-[#00ff9d] hover:text-[#00ff9d] hover:scale-105`}
        >
          <i className={`${link.brand ? 'fa-brands' : 'fa-solid'} ${link.icon}`} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}