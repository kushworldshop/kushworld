/**
 * Generate Grok SEO descriptions for flower products (strain research + photos).
 * Run on the server where XAI_API_KEY is set:
 *   npx tsx scripts/generate-flower-descriptions.ts
 * Optional: --force to overwrite existing descriptions
 */
import fs from 'fs/promises';
import path from 'path';
import { generateProductDescriptionWithGrok } from '../lib/grokProductDescription';
import { DEFAULT_PRODUCT_DESCRIPTION_TONE } from '../lib/grokProductDescriptionTones';
import type { Product } from '../lib/products';

const CUSTOM_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'custom-products.json');
const force = process.argv.includes('--force');

async function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  try {
    const raw = await fs.readFile(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env optional when vars already exported
  }
}

async function main() {
  await loadEnvFile();

  const raw = await fs.readFile(CUSTOM_PRODUCTS_FILE, 'utf8');
  const products = JSON.parse(raw) as Product[];
  const flower = products.filter((p) => p.category === 'flower');

  if (flower.length === 0) {
    console.log('No flower products in custom-products.json');
    return;
  }

  console.log(`Generating descriptions for ${flower.length} flower product(s)...`);

  let updated = 0;
  for (const product of flower) {
    if (product.description?.trim() && !force) {
      console.log(`  skip ${product.name} (already has description)`);
      continue;
    }

    console.log(`  writing ${product.name}...`);
    const result = await generateProductDescriptionWithGrok({
      productId: product.id,
      name: product.name,
      category: product.category,
      subcategory: product.subcategory,
      price: product.price,
      image: product.image,
      existingDescription: product.description,
      tone: DEFAULT_PRODUCT_DESCRIPTION_TONE,
    });

    if ('error' in result) {
      console.error(`  FAILED ${product.name}: ${result.error}`);
      continue;
    }

    product.description = result.description;
    updated += 1;
    console.log(`  ok ${product.name} (${result.description.length} chars)`);
  }

  if (updated > 0) {
    await fs.writeFile(CUSTOM_PRODUCTS_FILE, JSON.stringify(products, null, 2) + '\n');
    console.log(`Saved ${updated} description(s) to custom-products.json`);
  } else {
    console.log('No descriptions updated.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});