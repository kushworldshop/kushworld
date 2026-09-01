/**
 * Add standard flower weight options (7g–446g) to all flower products.
 * Usage: node scripts/patch-flower-weights.mjs [optional name filter]
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '..', 'data', 'custom-products.json');
const filter = process.argv[2]?.toLowerCase().trim();

const FLOWER_POUND_GRAMS = 446;
const FLOWER_WEIGHT_GRAMS = [3.5, 7, 14, 28, 112, 228, 446];
const WEIGHT_GROUP_NAME = 'Weight';

function formatLabel(grams) {
  return grams === FLOWER_POUND_GRAMS ? `${grams}g (1 lb)` : `${grams}g`;
}

function weightPrice(poundPrice, grams) {
  return Math.round(((poundPrice * grams) / FLOWER_POUND_GRAMS) * 100) / 100;
}

function buildWeightGroup(poundPrice) {
  return {
    name: WEIGHT_GROUP_NAME,
    values: FLOWER_WEIGHT_GRAMS.map((grams) => ({
      label: formatLabel(grams),
      optionPrice: weightPrice(poundPrice, grams),
    })),
  };
}

function mergeWeights(optionGroups, poundPrice) {
  const others = (optionGroups ?? []).filter(
    (group) => group.name?.trim().toLowerCase() !== WEIGHT_GROUP_NAME.toLowerCase()
  );
  return [buildWeightGroup(poundPrice), ...others];
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

  const nextGroups = mergeWeights(product.optionGroups, product.price);
  const changed =
    JSON.stringify(nextGroups) !== JSON.stringify(product.optionGroups) ||
    product.hideBulkPricing !== true;

  if (!changed) continue;

  product.optionGroups = nextGroups;
  product.hideBulkPricing = true;
  updated += 1;
  console.log(
    `patched ${product.name} (${product.id})`,
    nextGroups[0].values.map((value) => `${value.label} $${value.optionPrice}`).join(' · ')
  );
}

if (updated > 0) {
  await fs.writeFile(file, JSON.stringify(products, null, 2));
}

console.log(`Done. Updated ${updated} flower product(s).`);