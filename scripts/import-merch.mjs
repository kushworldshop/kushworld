import fs from 'fs/promises';
import path from 'path';

const STUDIO_URL = 'https://kushworldstudio.co/products.json?limit=250';
const OUT_FILE = path.join(process.cwd(), 'lib', 'merch-catalog.json');

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferSubcategory(title) {
  const t = title.toUpperCase();
  if (t.includes('HOODIE')) return 'hoodies';
  if (t.includes('T-SHIRT') || t.includes('TEE')) return 'tees';
  if (t.includes('SNAPBACK') || t.includes('HAT') || t.includes('BEANIE')) return 'headwear';
  if (t.includes('MUG')) return 'accessories';
  if (t.includes('PILLOW')) return 'home';
  if (t.includes('FLAG')) return 'home';
  if (t.includes('SOCKS')) return 'accessories';
  if (t.includes('SHORTS') || t.includes('POLO')) return 'apparel';
  return 'merch';
}

function inferFeatured(title) {
  const t = title.toUpperCase();
  return (
    t.includes('SPECIAL EDITION') ||
    t.includes('LOGO LETTERS') ||
    t.includes('KUSH ACADEMY') ||
    t.includes('SNAPBACK')
  );
}

async function main() {
  const res = await fetch(STUDIO_URL);
  if (!res.ok) throw new Error(`Failed to fetch merch: ${res.status}`);
  const { products } = await res.json();

  const catalog = products.map((p) => {
    const prices = p.variants.map((v) => parseFloat(v.price));
    const minPrice = Math.min(...prices);
    const sizeOption = p.options.find((o) => o.name === 'Size');
    const colorOption = p.options.find((o) => o.name === 'Color');
    const sizes = sizeOption?.values?.filter((v) => v !== 'Default Title') ?? [];
    const colors = colorOption?.values ?? [];

    return {
      id: `merch-${p.id}`,
      slug: p.handle,
      name: p.title,
      price: minPrice,
      compareAtPrice: p.variants[0]?.compare_at_price
        ? parseFloat(p.variants[0].compare_at_price)
        : null,
      image: p.images[0]?.src ?? '',
      images: p.images.map((img) => img.src),
      sizes: sizes.length ? sizes : undefined,
      colors: colors.length ? colors : undefined,
      category: 'merch',
      merchSubcategory: inferSubcategory(p.title),
      featured: inferFeatured(p.title),
      description: stripHtml(p.body_html).slice(0, 400),
      studioUrl: `https://kushworldstudio.co/products/${p.handle}`,
    };
  });

  catalog.sort((a, b) => a.name.localeCompare(b.name));
  await fs.writeFile(OUT_FILE, JSON.stringify(catalog, null, 2));
  console.log(`Imported ${catalog.length} merch products → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});