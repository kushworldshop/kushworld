#!/usr/bin/env node
/**
 * VPS cron helper — sends abandoned cart reminder emails.
 *
 * Crontab example (every hour):
 *   0 * * * * cd /var/www/kushworld && /usr/bin/node scripts/run-abandoned-carts-cron.mjs >> /var/log/kushworld-abandoned-carts.log 2>&1
 *
 * Requires CRON_SECRET in /var/www/kushworld/.env
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
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
}

loadEnvFile(path.join(ROOT, '.env'));
loadEnvFile(path.join(ROOT, '.env.local'));

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kushworld.shop';
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error('[abandoned-carts-cron] CRON_SECRET is not set — aborting');
  process.exit(1);
}

const endpoint = `${siteUrl.replace(/\/$/, '')}/api/cron/abandoned-carts`;

const res = await fetch(endpoint, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  },
});

const data = await res.json().catch(() => ({}));

if (!res.ok || !data.success) {
  console.error('[abandoned-carts-cron] Failed:', res.status, data);
  process.exit(1);
}

console.log(
  `[abandoned-carts-cron] pruned=${data.pruned} eligible=${data.eligible} sent=${data.sent} skipped=${data.skipped} failed=${data.failed}`
);