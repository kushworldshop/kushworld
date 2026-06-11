import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const importDir = path.join(root, '_product_import');
const productsDir = path.join(root, 'public', 'products');

function parsePrice(raw) {
  const value = raw.trim().toLowerCase().replace(/,/g, '');
  if (value.endsWith('k')) {
    return parseFloat(value.slice(0, -1)) * 1000;
  }
  return parseFloat(value);
}

function categorize(name) {
  const lower = name.toLowerCase();
  if (lower.includes('mushroom')) return 'mushrooms';
  if (lower.includes('crumble') || lower.includes('sugar') || lower.includes('badder') || lower.includes('combo') || lower.includes('terpies') || lower.includes('havana') || lower.includes('phaded') || lower.includes('snowcap')) {
    return 'concentrates';
  }
  if (lower.includes('kaws') || lower.includes('flower')) return 'flower';
  return 'vapes';
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function collectImages(dir) {
  const images = [];
  if (!fs.existsSync(dir)) return images;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      images.push(...collectImages(fullPath));
      continue;
    }
    if (!/\.(jpe?g|png|webp)$/i.test(entry.name)) continue;
    if (/\(1\)\./i.test(entry.name)) continue;
    images.push(fullPath);
  }

  return images;
}

fs.mkdirSync(productsDir, { recursive: true });

const seen = new Map();
const products = [];

for (const imagePath of collectImages(importDir)) {
  const filename = path.basename(imagePath);
  const match = filename.match(/^(.+?)_ LA-[^$]+\$\s*_?\s*OT-([^$]+)\$/i);
  if (!match) continue;

  const name = match[1].trim();
  const price = parsePrice(match[2]);
  const key = name.toLowerCase();

  if (seen.has(key)) continue;
  seen.set(key, true);

  const slug = slugify(name);
  const ext = path.extname(filename).toLowerCase();
  const destName = `${slug}${ext}`;
  const destPath = path.join(productsDir, destName);

  fs.copyFileSync(imagePath, destPath);

  products.push({
    id: String(products.length + 1),
    name,
    price,
    image: `/products/${destName}`,
    sizes: [],
    category: categorize(name),
  });
}

products.sort((a, b) => a.name.localeCompare(b.name));

const productsTs = `export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  sizes?: string[];
  category: string;
}

export const products: Product[] = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync(path.join(root, 'lib', 'products.ts'), productsTs);
console.log(`Imported ${products.length} products into lib/products.ts`);