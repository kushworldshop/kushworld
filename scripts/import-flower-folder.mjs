import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const sourceDir =
  process.argv[2] || path.join(process.env.USERPROFILE || '', 'OneDrive', 'Desktop', 'Kush World Flower');

const CUSTOM_PRODUCTS_FILE = path.join(root, 'data', 'custom-products.json');
const UPLOAD_DIR = path.join(root, 'public', 'products', 'uploads');

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const EXT_BY_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildCustomProductId(name) {
  return `custom-${slugify(name)}`;
}

function parseFlowerImageFilename(filename) {
  const base = filename.replace(/\.[^.]+$/i, '').trim();
  const handMatch = base.match(/^(.+?)\s+hand$/i);
  if (handMatch) return { strain: handMatch[1].trim(), kind: 'hand' };
  const bagMatch = base.match(/^(.+?)\s+bag$/i);
  if (bagMatch) return { strain: bagMatch[1].trim(), kind: 'bag' };
  return null;
}

function buildProductImageFilename(productId, ext) {
  const safeId = productId.replace(/[^a-zA-Z0-9_-]/g, '');
  return `product-${safeId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
}

async function ensureDirs() {
  await fs.mkdir(path.dirname(CUSTOM_PRODUCTS_FILE), { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  try {
    await fs.access(CUSTOM_PRODUCTS_FILE);
  } catch {
    await fs.writeFile(CUSTOM_PRODUCTS_FILE, '[]\n');
  }
}

async function readCustomProducts() {
  const data = await fs.readFile(CUSTOM_PRODUCTS_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeCustomProducts(products) {
  await fs.writeFile(CUSTOM_PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

async function copyImage(productId, sourcePath) {
  const ext = path.extname(sourcePath).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`Unsupported file type: ${sourcePath}`);
  }
  const filename = buildProductImageFilename(productId, ext);
  const destPath = path.join(UPLOAD_DIR, filename);
  await fs.copyFile(sourcePath, destPath);
  return `/products/uploads/${filename}`;
}

async function main() {
  await ensureDirs();

  let entries;
  try {
    entries = await fs.readdir(sourceDir);
  } catch {
    console.error(`Source folder not found: ${sourceDir}`);
    process.exit(1);
  }

  const groups = new Map();
  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) continue;
    const parsed = parseFlowerImageFilename(entry);
    const strain = parsed?.strain || entry.replace(/\.[^.]+$/i, '').trim();
    const key = strain.toLowerCase();
    const group = groups.get(key) ?? { strain, files: {} };
    if (parsed?.kind === 'hand') group.files.hand = entry;
    else if (parsed?.kind === 'bag') group.files.bag = entry;
    else group.files.other = [...(group.files.other || []), entry];
    groups.set(key, group);
  }

  const products = await readCustomProducts();
  const category = 'flower';
  const defaultPrice = 700;
  let created = 0;
  let skipped = 0;

  for (const group of [...groups.values()].sort((a, b) => a.strain.localeCompare(b.strain))) {
    const productId = buildCustomProductId(group.strain);
    if (products.some((product) => product.id === productId)) {
      console.log(`SKIP  ${group.strain} (already exists)`);
      skipped += 1;
      continue;
    }

    const ordered = [];
    if (group.files.hand) ordered.push({ file: group.files.hand, kind: 'hand' });
    if (group.files.bag) ordered.push({ file: group.files.bag, kind: 'bag' });
    for (const file of group.files.other || []) ordered.push({ file, kind: 'other' });

    if (ordered.length === 0) {
      console.log(`SKIP  ${group.strain} (no images)`);
      skipped += 1;
      continue;
    }

    const imagePaths = [];
    for (const item of ordered) {
      const sourcePath = path.join(sourceDir, item.file);
      imagePaths.push(await copyImage(productId, sourcePath));
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const product = {
      id: productId,
      name: group.strain,
      slug: slugify(group.strain),
      price: defaultPrice,
      image: imagePaths[0],
      images: imagePaths.length > 1 ? imagePaths : undefined,
      category,
      sizes: [],
      isNew: true,
    };

    products.push(product);
    created += 1;
    console.log(`ADD   ${group.strain} (${imagePaths.length} image${imagePaths.length === 1 ? '' : 's'})`);
  }

  await writeCustomProducts(products);
  console.log(`\nDone: ${created} created, ${skipped} skipped, ${products.length} total custom products`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});