import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'maintenance.json');

export interface MaintenanceState {
  enabled: boolean;
  message: string;
}

export const DEFAULT_MAINTENANCE: MaintenanceState = {
  enabled: false,
  message: "Kush World is updating. We'll be back shortly.",
};

export function readMaintenanceModeSync(): MaintenanceState {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Partial<MaintenanceState>;
    return {
      enabled: Boolean(parsed.enabled),
      message: String(parsed.message || DEFAULT_MAINTENANCE.message),
    };
  } catch {
    return { ...DEFAULT_MAINTENANCE };
  }
}

export async function writeMaintenanceMode(next: MaintenanceState): Promise<MaintenanceState> {
  const state: MaintenanceState = {
    enabled: Boolean(next.enabled),
    message: String(next.message || DEFAULT_MAINTENANCE.message).trim() || DEFAULT_MAINTENANCE.message,
  };
  await fs.promises.mkdir(path.dirname(FILE), { recursive: true });
  await fs.promises.writeFile(
    FILE,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)
  );
  return state;
}

export function isMaintenanceExemptPath(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname === '/maintenance' ||
    pathname.startsWith('/track') ||
    pathname.startsWith('/api/orders/track') ||
    pathname.startsWith('/api/payments/btc/status') ||
    pathname === '/api/site-content' ||
    pathname.startsWith('/site-uploads') ||
    pathname.startsWith('/products/uploads') ||
    pathname.startsWith('/logo')
  );
}
