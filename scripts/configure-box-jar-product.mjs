#!/usr/bin/env node
/**
 * Restructure a box + single-jar concentrate product.
 * Usage: PRODUCT_ID=custom-arcadia-badder-cereal-edition JAR_PRICE=99.99 node scripts/configure-box-jar-product.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.KUSHWORLD_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const productId = process.env.PRODUCT_ID || 'custom-wholemelts-passport';
const jarPrice = Number(process.env.JAR_PRICE || 99.99);
const path = join(root, 'data', 'custom-products.json');
const products = JSON.parse(readFileSync(path, 'utf8'));
const index = products.findIndex((product) => product.id === productId);

if (index === -1) {
  console.log(`Product not found: ${productId}`);
  process.exit(1);
}

const product = products[index];
const flavorLabels = new Set();

for (const group of product.optionGroups ?? []) {
  for (const value of group.values ?? []) {
    const label = value.label?.trim();
    if (!label) continue;
    if (group.name?.toLowerCase() === 'size') continue;
    flavorLabels.add(label);
  }
}

const flavors = [...flavorLabels];
if (flavors.length === 0) {
  console.log('No flavor labels found to migrate');
  process.exit(1);
}

const jarAdjustment =
  product.optionGroups?.flatMap((g) => g.values ?? []).find((v) => v.priceAdjustment)?.priceAdjustment ??
  jarPrice;

products[index] = {
  ...product,
  optionGroups: [
    {
      name: 'Size',
      values: [
        { label: 'Full Box' },
        { label: 'Single 1oz Jar', optionPrice: jarAdjustment },
      ],
    },
    {
      name: 'Flavor',
      values: flavors.map((label) => ({ label })),
    },
  ],
};

writeFileSync(path, `${JSON.stringify(products, null, 2)}\n`);
console.log(
  `Configured ${product.name}: Full Box $${product.price}, Single 1oz Jar $${jarAdjustment}, ${flavors.length} flavors`
);