import { createHmac, timingSafeEqual } from 'crypto';
import { getSessionSecret } from '@/lib/security/secrets';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

export function createOrderAccessToken(orderId: string, email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({ orderId, email: normalizedEmail, exp })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyOrderAccessToken(
  orderId: string,
  email: string,
  token: string | null | undefined
): boolean {
  if (!token || !email) return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expected = sign(payload);
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
  } catch {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      orderId?: string;
      email?: string;
      exp?: number;
    };
    if (!data.orderId || !data.email || !data.exp || data.exp < Date.now()) return false;
    if (data.orderId !== orderId) return false;
    return data.email === email.trim().toLowerCase();
  } catch {
    return false;
  }
}