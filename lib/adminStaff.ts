import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import {
  allStaffPermissions,
  isStaffPermission,
  permissionsForRole,
  type StaffPermission,
  type StaffRole,
} from '@/lib/adminPermissions';

const STAFF_FILE = path.join(process.cwd(), 'data', 'admin-staff.json');

export interface AdminStaffRecord {
  id: string;
  name: string;
  username: string;
  passcodeHash: string;
  role: 'admin' | 'mod';
  permissions: StaffPermission[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  /** Linked site member. When set, they can sign in to /admin with their account email + password. */
  userId?: string;
}

interface StaffFile {
  staff: AdminStaffRecord[];
  updatedAt: string;
}

export type PublicStaff = Omit<AdminStaffRecord, 'passcodeHash'>;

function emptyFile(): StaffFile {
  return { staff: [], updatedAt: new Date().toISOString() };
}

function readFile(): StaffFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(STAFF_FILE, 'utf8')) as Partial<StaffFile>;
    const staff = Array.isArray(parsed.staff) ? parsed.staff : [];
    return {
      staff: staff.filter((row) => row && typeof row.id === 'string' && typeof row.username === 'string'),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return emptyFile();
  }
}

function writeFile(file: StaffFile): void {
  fs.mkdirSync(path.dirname(STAFF_FILE), { recursive: true });
  file.updatedAt = new Date().toISOString();
  fs.writeFileSync(STAFF_FILE, JSON.stringify(file, null, 2));
}

export function toPublicStaff(row: AdminStaffRecord): PublicStaff {
  const { passcodeHash: _hash, ...rest } = row;
  return rest;
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return /^[a-z0-9._-]{2,32}$/.test(value);
}

export function listStaff(): PublicStaff[] {
  return readFile().staff.map(toPublicStaff);
}

export function getStaffById(id: string): AdminStaffRecord | undefined {
  return readFile().staff.find((row) => row.id === id);
}

export function getStaffByUsername(username: string): AdminStaffRecord | undefined {
  const key = normalizeUsername(username);
  return readFile().staff.find((row) => row.username === key);
}

export function getStaffByUserId(userId: string): AdminStaffRecord | undefined {
  const id = userId.trim();
  if (!id) return undefined;
  return readFile().staff.find((row) => row.userId === id);
}

export function verifyStaffPasscode(row: AdminStaffRecord, passcode: string): boolean {
  if (!row.enabled || !passcode || !row.passcodeHash) return false;
  try {
    return bcrypt.compareSync(passcode, row.passcodeHash);
  } catch {
    return false;
  }
}

function uniqueUsernameForEmail(email: string): string {
  const local = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 24);
  const base = isValidUsername(local) ? local : `member${Date.now().toString(36).slice(-8)}`;
  const file = readFile();
  if (!file.staff.some((row) => row.username === base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base.slice(0, 28)}${i}`.slice(0, 32);
    if (isValidUsername(candidate) && !file.staff.some((row) => row.username === candidate)) {
      return candidate;
    }
  }
  return `m${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function createStaff(input: {
  name: string;
  username: string;
  passcode: string;
  role: 'admin' | 'mod';
  permissions?: StaffPermission[];
  userId?: string;
}): PublicStaff {
  const name = input.name.trim();
  const username = normalizeUsername(input.username);
  const passcode = input.passcode;
  const userId = input.userId?.trim() || undefined;
  if (!name) throw new Error('Name is required');
  if (!isValidUsername(username)) throw new Error('Username must be 2–32 letters, numbers, dots, or dashes');
  if (passcode.trim().length < 6 && !userId) throw new Error('Passcode must be at least 6 characters');
  if (input.role !== 'admin' && input.role !== 'mod') throw new Error('Role must be admin or mod');

  const file = readFile();
  if (file.staff.some((row) => row.username === username)) {
    throw new Error('That username is already in use');
  }
  if (userId && file.staff.some((row) => row.userId === userId)) {
    throw new Error('This member already has a staff role');
  }

  const now = new Date().toISOString();
  const row: AdminStaffRecord = {
    id: randomUUID(),
    name,
    username,
    passcodeHash: passcode.trim().length >= 6 ? bcrypt.hashSync(passcode, 10) : '',
    role: input.role,
    permissions: input.role === 'admin' ? allStaffPermissions() : permissionsForRole('mod', input.permissions),
    enabled: true,
    createdAt: now,
    updatedAt: now,
    userId,
  };
  file.staff.push(row);
  writeFile(file);
  return toPublicStaff(row);
}

export function setMemberStaffAccess(input: {
  userId: string;
  name: string;
  email: string;
  role: 'none' | 'mod' | 'admin';
  permissions?: StaffPermission[];
}): PublicStaff | null {
  const userId = input.userId.trim();
  if (!userId) throw new Error('User id required');
  const existing = getStaffByUserId(userId);

  if (input.role === 'none') {
    if (existing) deleteStaff(existing.id);
    return null;
  }

  if (existing) {
    return updateStaff(existing.id, {
      name: input.name,
      role: input.role,
      permissions: input.permissions,
      enabled: true,
    });
  }

  return createStaff({
    name: input.name,
    username: uniqueUsernameForEmail(input.email),
    passcode: '',
    role: input.role,
    permissions: input.permissions,
    userId,
  });
}

export function updateStaff(
  id: string,
  updates: {
    name?: string;
    passcode?: string;
    role?: 'admin' | 'mod';
    permissions?: StaffPermission[];
    enabled?: boolean;
  }
): PublicStaff {
  const file = readFile();
  const index = file.staff.findIndex((row) => row.id === id);
  if (index === -1) throw new Error('Staff not found');

  const row = { ...file.staff[index] };
  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name) throw new Error('Name is required');
    row.name = name;
  }
  if (updates.passcode !== undefined && updates.passcode.length > 0) {
    if (updates.passcode.trim().length < 6) throw new Error('Passcode must be at least 6 characters');
    row.passcodeHash = bcrypt.hashSync(updates.passcode, 10);
  }
  if (updates.role === 'admin' || updates.role === 'mod') {
    row.role = updates.role;
  }
  if (updates.permissions !== undefined || updates.role) {
    row.permissions =
      row.role === 'admin'
        ? allStaffPermissions()
        : permissionsForRole('mod', updates.permissions ?? row.permissions);
  }
  if (typeof updates.enabled === 'boolean') row.enabled = updates.enabled;
  row.updatedAt = new Date().toISOString();
  file.staff[index] = row;
  writeFile(file);
  return toPublicStaff(row);
}

export function deleteStaff(id: string): boolean {
  const file = readFile();
  const next = file.staff.filter((row) => row.id !== id);
  if (next.length === file.staff.length) return false;
  file.staff = next;
  writeFile(file);
  return true;
}

export function staffPermissions(row: AdminStaffRecord): StaffPermission[] {
  return permissionsForRole(row.role, row.permissions);
}

export function sanitizePermissionList(values: unknown): StaffPermission[] {
  if (!Array.isArray(values)) return [];
  return values.filter(isStaffPermission);
}

export type { StaffRole };
