import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const coaDir = path.join(root, 'public', 'products', 'coa');

// Read product slugs from lib/products.ts by parsing image paths
const productsTs = fs.readFileSync(path.join(root, 'lib', 'products.ts'), 'utf8');
const imageMatches = [...productsTs.matchAll(/"image": "\/products\/([^"]+)"/g)];
const slugs = imageMatches.map((m) => m[1].replace(/\.[^.]+$/, ''));

const existing = new Set(
  fs.existsSync(coaDir)
    ? fs.readdirSync(coaDir).filter((f) => f.endsWith('.pdf')).map((f) => f.replace(/\.pdf$/i, ''))
    : []
);

console.log('\nCOA PDF Status\n' + '='.repeat(40));
for (const slug of slugs) {
  const status = existing.has(slug) ? '✓' : '✗ missing';
  console.log(`${status}  ${slug}.pdf`);
}
console.log(`\nDrop PDFs in: public/products/coa/\nName each file to match the product slug (e.g. caliclear.pdf)\n`);