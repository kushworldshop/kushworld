import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { getPopularWishlistProducts } from '@/lib/wishlistStats';

export async function GET(request: NextRequest) {
  const password = request.headers.get('x-admin-password');
  if (!isAdminAuthorized(password)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') || 50);
    const stats = await getPopularWishlistProducts(limit);
    return NextResponse.json({ success: true, ...stats });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load wishlist stats' }, { status: 500 });
  }
}