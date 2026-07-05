import { NextResponse } from 'next/server';

/** @deprecated Anonymous wishlist tracking removed — use /api/wishlist with account login */
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Wishlist requires a logged-in account. Use /api/wishlist instead.' },
    { status: 401 }
  );
}