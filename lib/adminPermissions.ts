import type { NextRequest } from 'next/server';

export const STAFF_PERMISSIONS = [
  'orders',
  'members',
  'products',
  'productsDelete',
  'wheel',
  'wishlist',
  'carts',
  'social',
  'subscriptions',
  'settings',
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

export type StaffRole = 'owner' | 'admin' | 'mod';

export const STAFF_PERMISSION_LABELS: Record<StaffPermission, string> = {
  orders: 'Orders & shipping',
  members: 'Members & ID checks',
  products: 'Products (add / edit)',
  productsDelete: 'Delete products',
  wheel: 'Wheel wins',
  wishlist: 'Wishlist',
  carts: 'Live carts',
  social: 'X rewards',
  subscriptions: 'Subscriptions',
  settings: 'Site settings',
};

export function isStaffPermission(value: unknown): value is StaffPermission {
  return typeof value === 'string' && (STAFF_PERMISSIONS as readonly string[]).includes(value);
}

export function allStaffPermissions(): StaffPermission[] {
  return [...STAFF_PERMISSIONS];
}

export function permissionsForRole(role: StaffRole, selected?: StaffPermission[]): StaffPermission[] {
  if (role === 'owner' || role === 'admin') return allStaffPermissions();
  return (selected ?? []).filter(isStaffPermission);
}

export function permissionForRequest(request: NextRequest): StaffPermission | 'owner' | 'any' {
  const path = request.nextUrl.pathname;
  const method = request.method.toUpperCase();

  if (
    path.startsWith('/api/admin/session') ||
    path.startsWith('/api/admin/login') ||
    path.startsWith('/api/admin/logout')
  ) {
    return 'any';
  }

  if (path.startsWith('/api/admin/staff')) return 'owner';

  if (path.startsWith('/api/admin/products')) {
    if (method === 'DELETE') return 'productsDelete';
    return 'products';
  }

  if (
    path.startsWith('/api/admin/users') ||
    path.startsWith('/api/admin/id-image') ||
    path.startsWith('/api/admin/first-order-bonuses')
  ) {
    return 'members';
  }

  if (path.startsWith('/api/admin/spin-history')) return 'wheel';
  if (path.startsWith('/api/admin/wishlist-stats')) return 'wishlist';
  if (path.startsWith('/api/admin/abandoned-carts') || path.startsWith('/api/admin/cart-stats')) {
    return 'carts';
  }
  if (path.startsWith('/api/admin/social-rewards')) return 'social';
  if (path.startsWith('/api/admin/subscriptions')) return 'subscriptions';
  if (
    path.startsWith('/api/admin/site-content') ||
    path.startsWith('/api/admin/settings')
  ) {
    return 'settings';
  }

  if (path.startsWith('/api/orders') || path.startsWith('/api/shipping')) return 'orders';
  if (path.startsWith('/api/grok/chat')) return 'any';
  if (path.startsWith('/api/admin/')) return 'settings';

  return 'any';
}
