import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';

export const CART_TRACK_COOKIE = 'kushworld_cart_track';
const TRACK_DAYS = 30;

export function cartTrackCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TRACK_DAYS * 24 * 60 * 60,
  };
}

export async function getCartTrackId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_TRACK_COOKIE)?.value ?? null;
}

export function createCartTrackId(): string {
  return randomUUID();
}