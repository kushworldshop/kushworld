'use client';

import { useSiteContent } from '@/lib/useSiteContent';
import { getActiveSocialLinks } from '@/lib/socialLinks';

export default function CommunitySection({ title, body }: { title: string; body: string }) {
  const { content } = useSiteContent();
  const links = getActiveSocialLinks(content.social);

  if (links.length === 0) return null;

  return (
    <section className="py-20 px-6 bg-black">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">{title}</h2>
        <p className="text-zinc-400 mb-8">{body}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700 hover:border-[#00ff9d] px-5 py-3 rounded-2xl text-sm font-medium transition"
            >
              <i className={`${link.icon} text-[#00ff9d]`} />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}