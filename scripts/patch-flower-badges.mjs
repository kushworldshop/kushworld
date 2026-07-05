/**
 * Backfill shop badge metadata on flower products missing strain/tier/effects.
 * Usage: node scripts/patch-flower-badges.mjs [optional name filter]
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'data', 'custom-products.json');
const filter = process.argv[2]?.toLowerCase().trim();

const EFFECT_KEYWORDS = {
  relax: ['relax', 'sleep', 'calm', 'couch', 'indica', 'earth', 'earthy'],
  focus: ['focus', 'alert', 'productive', 'clear'],
  social: ['social', 'talkative', 'party', 'uplifting'],
  relief: ['relief', 'comfort', 'soothe', 'body'],
  creative: ['creative', 'inspire', 'artistic'],
  energy: ['energy', 'active', 'sativa', 'daytime', 'citrus', 'lemon', 'lime', 'diesel', 'pinene'],
  euphoric: ['euphoric', 'happy', 'mood', 'giggly', 'candy', 'sweet', 'berry', 'vanilla', 'cherry'],
};

function inferStrainType(text) {
  const lower = text.toLowerCase();
  if (/indica-leaning|indica leaning/.test(lower)) return 'Indica';
  if (/sativa-leaning|sativa leaning/.test(lower)) return 'Sativa';
  if (/\bhybrid\b/.test(lower)) return 'Hybrid';
  if (/\bindica\b/.test(lower) && /\bsativa\b/.test(lower)) return 'Hybrid';
  if (/\bindica\b/.test(lower)) return 'Indica';
  if (/\bsativa\b/.test(lower)) return 'Sativa';
  return 'Hybrid';
}

function inferTier(name, description, subcategory) {
  const hay = `${name} ${description}`.toLowerCase();
  if (/\bsmalls\b/.test(hay) || name.toUpperCase().includes('SMALL')) return 'Smalls';
  if (subcategory === 'indoor' || /\bindoor\b/.test(hay)) return 'Exotic';
  return 'Exotic';
}

function inferEffects(text) {
  const lower = text.toLowerCase();
  const scores = new Map();
  for (const [vibeId, keywords] of Object.entries(EFFECT_KEYWORDS)) {
    const hits = keywords.filter((keyword) => lower.includes(keyword)).length;
    if (hits > 0) scores.set(vibeId, hits);
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([id]) => id);
}

const raw = await fs.readFile(file, 'utf8');
const products = JSON.parse(raw);
let updated = 0;

for (const product of products) {
  if (product.category !== 'flower') continue;
  if (filter) {
    const hay = `${product.id} ${product.name}`.toLowerCase();
    if (!hay.includes(filter)) continue;
  }

  const description = product.description ?? '';
  const needs =
    !product.strainType || !product.tier || !product.effects?.length;

  if (!needs) continue;

  const haystack = `${product.name} ${description}`;
  if (!product.strainType) product.strainType = inferStrainType(haystack);
  if (!product.tier) product.tier = inferTier(product.name, description, product.subcategory);
  if (!product.effects?.length) product.effects = inferEffects(haystack);
  if (!product.subcategory && /\bindoor\b/i.test(haystack)) product.subcategory = 'indoor';

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