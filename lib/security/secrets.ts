const DEV_SESSION_SECRET = 'kushworld-dev-secret-change-in-production';
const DEV_ADMIN_PASSWORD = 'kushworld2026';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isWeakProductionSecret(name: string, value: string | undefined, devFallback: string): string {
  if (!isProduction()) {
    return value || devFallback;
  }

  if (!value || value.trim().length === 0) {
    throw new Error(`${name} must be set in production (.env on the server).`);
  }

  if (value === devFallback || value.trim().length < 16) {
    console.error(
      `[security] WARNING: ${name} is weak. Set a unique 16+ character value in production .env.`
    );
  }

  return value;
}

export function getSessionSecret(): string {
  return isWeakProductionSecret('SESSION_SECRET', process.env.SESSION_SECRET, DEV_SESSION_SECRET);
}

export function getAdminPassword(): string {
  return isWeakProductionSecret('ADMIN_PASSWORD', process.env.ADMIN_PASSWORD, DEV_ADMIN_PASSWORD);
}