import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.KUSHWORLD_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'data', 'custom-products.json');
const products = JSON.parse(readFileSync(path, 'utf8'));
const concentrates = products.filter((p) => p.category === 'concentrates');
for (const p of concentrates) {
  const groups = p.optionGroups ?? [];
  const adj = groups.flatMap((g) => g.values?.map((v) => v.priceAdjustment).filter(Boolean) ?? []);
  const fixed = groups.flatMap((g) => g.values?.map((v) => v.optionPrice).filter((x) => x !== undefined) ?? []);
  console.log(JSON.stringify({ id: p.id, name: p.name, price: p.price, groups: groups.length, adjustments: adj, optionPrices: fixed }));
}