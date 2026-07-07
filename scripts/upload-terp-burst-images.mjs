/**
 * Enhance Terp Burst edibles photos and update the live product listing.
 * Usage: node scripts/upload-terp-burst-images.mjs
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(process.env.USERPROFILE || '', 'Downloads', 'terp burst');
const OUT_DIR = path.join(ROOT, 'tmp', 'terp-burst-enhanced');
const PRODUCT_ID = 'custom-terp-burst-rosin-gummies';

/** Source filename -> exact flavor label on the site */
const FLAVOR_BY_FILE = {
  'photo_2026-07-06_22-28-11.jpg': 'Cherry Ice',
  'photo_2026-07-06_22-28-14.jpg': 'Guava Glow',
  'photo_2026-07-06_22-28-08.jpg': 'Pineapple Twist',
  'photo_2026-07-06_22-27-59.jpg': 'Cranberry',
  'photo_2026-07-06_22-27-56.jpg': 'Mulberry',
  'photo_2026-07-06_22-27-42.jpg': 'Grape CoolAid',
  'photo_2026-07-06_22-28-02.jpg': 'Sour Apple Shock',
  'photo_2026-07-06_22-27-49.jpg': 'Papaya Punch',
  'photo_2026-07-06_22-27-52.jpg': 'Strawberry Kiwi',
  'photo_2026-07-06_22-28-05.jpg': 'Tangerine Splash',
  'photo_2026-07-06_22-27-45.jpg': 'Classic Lemonade',
  'photo_2026-07-06_22-27-36.jpg': 'Gummy Bear Pop',
  'photo_2026-07-06_22-27-29.jpg': 'Blueberry Burst',
  'photo_2026-07-06_22-27-33.jpg': 'Kiwi Splash',
  'photo_2026-07-06_22-27-17.jpg': 'Honeydew Mist',
  'photo_2026-07-06_22-27-23.jpg': 'Cool Cantelope',
  'photo_2026-07-06_22-27-26.jpg': 'Lime Popz',
  'photo_2026-07-06_22-27-01.jpg': 'Mixed Berry',
};

const DESCRIPTION = `Terp Burst Liquid Diamond Infused Gummies — premium 800mg pouches with 8 pieces at 100mg each (22.4g net weight). California-compliant packaging. Pick your flavor below.

Each pouch is liquid diamond infused for a clean, potent edible experience. Lab-tested hemp-derived product — 21+ only.`;

function slugifyFlavor(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function enhanceImage(inputPath, outputPath) {
  await sharp(inputPath)
    .rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: false })
    .normalize()
    .modulate({ saturation: 1.08, brightness: 1.02 })
    .sharpen({ sigma: 1.1, m1: 0.5, m2: 0.35, x1: 2, y2: 10, y3: 20 })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(outputPath);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const entries = [];
  for (const [file, flavor] of Object.entries(FLAVOR_BY_FILE)) {
    const src = path.join(SOURCE_DIR, file);
    try {
      await fs.access(src);
    } catch {
      console.warn(`Missing source file: ${file}`);
      continue;
    }
    const outName = `terp-burst-${slugifyFlavor(flavor)}.jpg`;
    const outPath = path.join(OUT_DIR, outName);
    await enhanceImage(src, outPath);
    const url = `/products/uploads/${outName}`;
    entries.push({ flavor, file, outName, url });
    console.log(`enhanced ${flavor} -> ${outName}`);
  }

  const manifest = {
    productId: PRODUCT_ID,
    coverFlavor: 'Guava Glow',
    entries,
    missingFlavors: ['Sour Watermelon', 'Coconut Lime'],
    description: DESCRIPTION,
  };

  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nEnhanced ${entries.length} images -> ${OUT_DIR}`);
  console.log('Missing photos for:', manifest.missingFlavors.join(', '));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});