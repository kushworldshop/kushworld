/**
 * Backfill shop badge metadata on flower products missing strain/tier/effects.
 * Usage: node scripts/patch-flower-badges.mjs [product-id-or-name-substring]
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'data', 'custom-products.json');
const filter = process.argv[2]?.toLowerCase().trim();

const patches = {
  'custom-blue-agave': {
    strainType: 'Hybrid',
    tier: 'Exotic',
    effects: ['euphoric', 'energy'],
  },
  'custom-wedding-crasher': {
    strainType: 'Indica',
    tier: 'Exotic',
    effects: ['relax', 'euphoric'],
  },
};

const raw = await fs.readFile(file, 'utf8');
const products = JSON.parse(raw);
let updated = 0;

for (const product of products) {
  if (product.category !== 'flower') continue;
  if (filter) {
    const hay = `${product.id} ${product.name}`.toLowerCase();
    if (!hay.includes(filter)) continue;
  }

  const preset = patches[product.id];
  const needs =
    !product.strainType || !product.tier || !product.effects?.length;

  if (!needs && !preset) continue;

  if (preset) {
    Object.assign(product, preset);
  } else if (!product.strainType && /hybrid/i.test(product.description ?? '')) {
    product.strainType = 'Hybrid';
  } else if (!product.strainType && /indica/i.test(product.description ?? '')) {
    product.strainType = 'Indica';
  }

  if (!product.tier && /smalls/i.test(product.name)) product.tier = 'Smalls';
  if (!product.tier && product.subcategory === 'indoor') product.tier = 'Exotic';

  updated += 1;
  console.log(`patched ${product.name} (${product.id})`, {
    strainType: product.strainType,
    tier: product.tier,
    effects: product.effects,
    thcaPercent: product.thcaPercent,
  });
}

if (updated > 0) {
  await fs.writeFile(file, JSON.stringify(products, null, 2) + '\n');
  console.log(`Saved ${updated} product(s).`);
} else {
  console.log('No products needed patching.');
}