export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kushworld2026';

export function isAdminAuthorized(password: string | null | undefined): boolean {
  return password === ADMIN_PASSWORD;
}