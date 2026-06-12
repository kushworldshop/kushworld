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

  const users = await readJson<Array<{ email: string; idVerified?: boolean; idVerification?: UserIdVerification }>>(
    USERS_FILE,
    []
  );
  if (
    users.some(
      (u) =>
        u.email.toLowerCase() === normalized &&
        (u.idVerified || u.idVerification?.status === 'verified')
    )
  ) {
    return true;
  }

  const orders = await readJson<Array<{ email?: string; customer?: { email?: string }; idVerification?: { status?: string } }>>(ORDERS_FILE, []);
  return orders.some((order) => {
    const orderEmail = (order.customer?.email || order.email || '').toLowerCase();
    return orderEmail === normalized && order.idVerification?.status === 'verified';
  });
}

export type UserIdVerificationStatus = 'none' | 'uploaded' | 'verified' | 'rejected';

export interface UserIdVerification {
  status: UserIdVerificationStatus;
  uploadedAt?: string;
  fileName?: string;
  mimeType?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export const ID_EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

export function getIdStoragePath(orderId: string, ext: string) {
  return path.join(ID_DIR, `${orderId}${ext}`);
}

export function getUserIdStoragePath(userId: string, ext: string) {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.join(ID_DIR, `user_${safeId}${ext}`);
}

export async function saveUserIdImage(
  userId: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ fileName: string; mimeType: string }> {
  await ensureDataDirs();
  const ext = ID_EXT_BY_TYPE[mimeType] || '.jpg';
  const storagePath = getUserIdStoragePath(userId, ext);
  const fileName = path.basename(storagePath);
  await fs.writeFile(storagePath, buffer);
  return { fileName, mimeType };
}

export async function getUserIdImagePath(userId: string, fileName?: string): Promise<string | null> {
  if (fileName) {
    const filePath = path.join(ID_DIR, fileName);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  }

  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  for (const ext of Object.values(ID_EXT_BY_TYPE)) {
    const filePath = path.join(ID_DIR, `user_${safeId}${ext}`);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // try next extension
    }
  }
  return null;
}

export async function markUserIdVerified(userId: string): Promise<boolean> {
  await ensureDataDirs();
  const users = await readJson<Array<{ id: string; email: string; idVerified?: boolean; idVerification?: UserIdVerification }>>(
    USERS_FILE,
    []
  );
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return false;

  const email = users[index].email;
  users[index].idVerified = true;
  users[index].idVerification = {
    ...users[index].idVerification,
    status: 'verified',
    verifiedAt: new Date().toISOString(),
    rejectedAt: undefined,
    rejectionReason: undefined,
  };
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  await markEmailVerified(email);
  return true;
}

export async function markUserIdRejected(userId: string, reason?: string): Promise<boolean> {
  await ensureDataDirs();
  const users = await readJson<Array<{ id: string; idVerified?: boolean; idVerification?: UserIdVerification }>>(
    USERS_FILE,
    []
  );
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return false;

  users[index].idVerified = false;
  users[index].idVerification = {
    ...users[index].idVerification,
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason?.trim() || undefined,
    verifiedAt: undefined,
  };
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  return true;
}