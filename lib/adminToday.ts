import type { StaffPermission } from '@/lib/adminPermissions';

export type AdminTodayItemId = 'new-orders' | 'unpaid' | 'id-review' | 'tds' | 'carts';
export type AdminTodayTab = 'orders' | 'members' | 'social' | 'carts';
export type AdminOrderQueue = 'new' | 'pending' | 'completed' | 'refunded' | 'unpaid' | 'id-review';

export interface AdminTodayItem {
  id: AdminTodayItemId;
  label: string;
  count: number;
  tab: AdminTodayTab;
  permission: StaffPermission;
}

export const ADMIN_TODAY_DEFS: Array<Omit<AdminTodayItem, 'count'>> = [
  { id: 'new-orders', label: 'New', tab: 'orders', permission: 'orders' },
  { id: 'unpaid', label: 'Unpaid', tab: 'orders', permission: 'orders' },
  { id: 'id-review', label: 'ID', tab: 'members', permission: 'members' },
  { id: 'tds', label: 'TDs', tab: 'social', permission: 'social' },
  { id: 'carts', label: 'Carts', tab: 'carts', permission: 'carts' },
];

export function todayFocusToOrderQueue(focus: AdminTodayItemId | null): AdminOrderQueue | null {
  if (focus === 'new-orders') return 'new';
  if (focus === 'unpaid') return 'unpaid';
  if (focus === 'id-review') return 'id-review';
  return null;
}
