import { randomBytes } from 'crypto';

export function generateOrderId(): string {
  return `KW-${randomBytes(6).toString('hex').toUpperCase()}`;
}