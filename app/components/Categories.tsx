'use client';

import Link from 'next/link';

const allCategories = [
  { label: 'Flower', icon: 'fa-leaf', href: '/shop/flower' },
  { label: 'Vapes', icon: 'fa-bolt', href: '/shop/vaporizers' },
  { label: 'Concentrates', icon: 'fa-fire', href: '/shop/concentrates' },
  { label: 'Edibles', icon: 'fa-cookie', href: '/shop/edibles' },
  { label: 'Moonrocks', icon: 'fa-meteor', href: '/shop/moonrocks' },
  { label: 'Snowcaps', icon: 'fa-snowflake', href: '/shop/snowcaps' },
  { label: 'Studio Merch', icon: 'fa-shirt', href: '/shop/merch' },
];

export default function Categories({ merchOnly = false }: { merchOnly?: boolean }) {
  const categories = merchOnly
    ? allCategories.filter((cat) => cat.href === '/shop/merch')
    : allCategories;

  return (
    <section id="categories" className="py-16 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-10">
          {merchOnly ? 'Studio merch' : 'Shop by category'}
        </h2>
        <div
          className={`grid gap-4 ${
            merchOnly ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7'
          }`}
        >
          {categories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group bg-zinc-900 rounded-3xl p-6 text-center hover:bg-zinc-800 border border-zinc-800 hover:border-[#00ff9d]/40 transition"
            >
              <i
                className={`fa-solid ${cat.icon} text-4xl text-[#00ff9d] mb-4 group-hover:scale-110 transition`}
              />
              <h3 className="text-base font-semibold">{cat.label}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
