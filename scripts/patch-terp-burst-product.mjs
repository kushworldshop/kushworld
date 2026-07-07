/**
 * Apply enhanced Terp Burst images to custom-products.json on the server.
 * Run on VPS after images are copied to public/products/uploads/
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PRODUCTS_FILE = path.join(ROOT, 'data', 'custom-products.json');
const MANIFEST_FILE = path.join(ROOT, 'tmp', 'terp-burst-enhanced', 'manifest.json');
const PRODUCT_ID = 'custom-terp-burst-rosin-gummies';

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_FILE, 'utf8'));
  const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
  const index = products.findIndex((p) => p.id === PRODUCT_ID);
  if (index === -1) throw new Error(`Product not found: ${PRODUCT_ID}`);

  const product = products[index];
  const imageByFlavor = new Map(manifest.entries.map((e) => [e.flavor, e.url]));
  const cover =
    imageByFlavor.get(manifest.coverFlavor) || manifest.entries[0]?.url || product.image;

  const flavorGroup = product.optionGroups?.find((g) => g.name === 'Flavor');
  if (!flavorGroup) throw new Error('Flavor option group missing');

  for (const value of flavorGroup.values) {
    const url = imageByFlavor.get(value.label);
    if (url) value.image = url;
  }

  const media = manifest.entries
    .slice()
    .sort((a, b) => a.flavor.localeCompare(b.flavor))
    .map((entry) => ({ type: 'image', url: entry.url }));

  const coverFirst = [
    media.find((m) => m.url === cover) || { type: 'image', url: cover },
    ...media.filter((m) => m.url !== cover),
  ];

  product.description = manifest.description;
  product.image = cover;
  product.images = coverFirst.map((m) => m.url);
  product.media = coverFirst;
  product.hideBulkPricing = true;

  products[index] = product;
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));

  console.log(`Updated ${product.name}`);
  console.log(`Cover: ${cover}`);
  console.log(`Gallery: ${coverFirst.length} images`);
  console.log(
    `Flavor swatches: ${flavorGroup.values.filter((v) => v.image).length}/${flavorGroup.values.length}`
  );
  if (manifest.missingFlavors?.length) {
    console.log('Still no photos for:', manifest.missingFlavors.join(', '));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});