#!/usr/bin/env node
/**
 * WHOLEMELTS PASSPORT: full box $1199.99, single 1oz jar $99.99 (pick flavor).
 * Run on VPS: node scripts/configure-passport-product.mjs
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
const oldFlavors =
  product.optionGroups?.[0]?.values?.map((value) => value.label).filter(Boolean) ?? [];

const flavors =
  oldFlavors.length > 0
    ? oldFlavors
    : [
        'Lemon Cherry Haze',
        'Jet Fuel',
        'Permanent Layover',
        'OG Airways',
        'Super Lemon Takeoff',
        'Strawberry Cloud',
        'Maui Cruiseliner',
        'Capt. Jack',
        'Ground Control',
        'Oreo Parfait',
        'Grease Monkey',
        'Northern Lights',
        'Gelato Mintz',
        'Gello Shotz',
        'Cap Junky',
        'Runtz Runway',
      ];

products[index] = {
  ...product,
  price: 1199.99,
  optionGroups: [
    {
      name: 'Size',
      values: [
        { label: 'Full Box' },
        { label: 'Single 1oz Jar', optionPrice: 99.99 },
      ],
    },
    {
      name: 'Flavor',
      values: flavors.map((label) => ({ label })),
    },
  ],
};

writeFileSync(path, `${JSON.stringify(products, null, 2)}\n`);
console.log(`Configured ${product.name}: Full Box $1199.99, Single 1oz Jar $99.99, ${flavors.length} flavors`);