#!/usr/bin/env node
/**
 * Remove erroneous per-variant price adjustments on WHOLEMELTS PASSPORT.
 * Run on VPS: node scripts/fix-passport-variant-pricing.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'data', 'custom-products.json');
const products = JSON.parse(readFileSync(path, 'utf8'));
const index = products.findIndex((product) => product.id === 'custom-wholemelts-passport');

if (index === -1) {
  console.log('custom-wholemelts-passport not found');
  process.exit(0);
}

const product = products[index];
let cleared = 0;

if (Array.isArray(product.optionGroups)) {
  for (const group of product.optionGroups) {
    for (const value of group.values || []) {
      if (value.priceAdjustment) {
        delete value.priceAdjustment;
        cleared += 1;
      }
    }
  }
}

products[index] = product;
writeFileSync(path, `${JSON.stringify(products, null, 2)}\n`);
console.log(`Cleared ${cleared} variant price adjustments on ${product.name}`);