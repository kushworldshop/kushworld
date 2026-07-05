#!/usr/bin/env node
/**
 * Remove hidden flags from product-overrides.json and custom-products.json.
 * Run on VPS: node scripts/unhide-all-products.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');

function unhideOverrides() {
  const path = join(dataDir, 'product-overrides.json');
  let raw = readFileSync(path, 'utf8').trim();
  if (!raw) raw = '{}';
  const overrides = JSON.parse(raw);
  let changed = 0;

  for (const [id, entry] of Object.entries(overrides)) {
    if (!entry || typeof entry !== 'object') continue;
    if (!entry.hidden) continue;
    delete entry.hidden;
    changed += 1;
    if (Object.keys(entry).length === 0) {
      delete overrides[id];
    }
  }

  writeFileSync(path, `${JSON.stringify(overrides, null, 2)}\n`);
  console.log(`product-overrides.json: unhid ${changed} products`);
}

function unhideCustom() {
  const path = join(dataDir, 'custom-products.json');
  const products = JSON.parse(readFileSync(path, 'utf8'));
  let changed = 0;

  for (const product of products) {
    if (product.hidden) {
      delete product.hidden;
      changed += 1;
    }
  }

  writeFileSync(path, `${JSON.stringify(products, null, 2)}\n`);
  console.log(`custom-products.json: unhid ${changed} products`);
}

unhideOverrides();
unhideCustom();
console.log('Done — all products visible.');