'use client';

import Link from 'next/link';
import { useSiteContent } from '@/lib/useSiteContent';

export default function Categories({ merchOnly = false }: { merchOnly?: boolean }) {
  const { content } = useSiteContent();
  const copy = content.homepageCopy.categories;
  const categories = merchOnly
    ? copy.items.filter((cat) => cat.href.includes('/merch'))
    : copy.items;
  const shown = categories.length > 0 ? categories : copy.items;

  if (shown.length === 0) return null;

  return (
    <section id="categories" className="py-16 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-10">
          {merchOnly ? copy.merchOnlyTitle : copy.title}
        </h2>
        <div
          className={`grid gap-4 ${
            shown.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7'
          }`}
        >
          {shown.map((cat) => (
            <Link
              key={`${cat.href}-${cat.label}`}
              href={cat.href || '/shop'}
              className="group bg-zinc-900 rounded-3xl p-6 text-center hover:bg-zinc-800 border border-zinc-800 hover:border-[#00ff9d]/40 transition"
            >
              {cat.icon && (
                <i
                  className={`fa-solid ${cat.icon} text-4xl text-[#00ff9d] mb-4 group-hover:scale-110 transition`}
                />
              )}
              <h3 className="text-base font-semibold">{cat.label}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
