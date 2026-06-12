import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const VERIFIED_FILE = path.join(DATA_DIR, 'verified-customers.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ID_DIR = path.join(DATA_DIR, 'id-verifications');

export const ALLOWED_ID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const MAX_ID_SIZE_BYTES = 5 * 1024 * 1024;

export async function ensureDataDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(ID_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

export async function getVerifiedEmails(): Promise<string[]> {
  await ensureDataDirs();
  return readJson<string[]>(VERIFIED_FILE, []);
}

export async function markEmailVerified(email: string) {
  await ensureDataDirs();
  const normalized = email.toLowerCase().trim();
  const verified = await getVerifiedEmails();
  if (!verified.includes(normalized)) {
    verified.push(normalized);
    await fs.writeFile(VERIFIED_FILE, JSON.stringify(verified, null, 2));
  }

  const users = await readJson<Array<{ email: string; idVerified?: boolean }>>(USERS_FILE, []);
  const userIndex = users.findIndex((u) => u.email.toLowerCase() === normalized);
  if (userIndex !== -1) {
    users[userIndex].idVerified = true;
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  }
}

export async function isCustomerVerified(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return false;

  const verified = await getVerifiedEmails();
  if (verified.includes(normalized)) return true;

  const users = await readJson<Array<{ email: string; idVerified?: boolean }>>(USERS_FILE, []);
  if (users.some((u) => u.email.toLowerCase() === normalized && u.idVerified)) {
    return true;
  }

  const orders = await readJson<Array<{ email?: string; customer?: { email?: string }; idVerification?: { status?: string } }>>(ORDERS_FILE, []);
  return orders.some((order) => {
    const orderEmail = (order.customer?.email || order.email || '').toLowerCase();
    return orderEmail === normalized && order.idVerification?.status === 'verified';
  });
}

export function getIdStoragePath(orderId: string, ext: string) {
  return path.join(ID_DIR, `${orderId}${ext}`);
}