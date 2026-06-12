import { NextRequest, NextResponse } from 'next/server';
import { recordWishlistAdd } from '@/lib/wishlistStats';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, name, image, category } = body;

    if (action !== 'add') {
      return NextResponse.json({ success: true });
    }

    if (!id || !name || !image) {
      return NextResponse.json({ success: false, error: 'Invalid product data' }, { status: 400 });
    }

    await recordWishlistAdd({
      id: String(id),
      name: String(name),
      image: String(image),
      category: typeof category === 'string' ? category : undefined,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to track wishlist' }, { status: 500 });
  }
}