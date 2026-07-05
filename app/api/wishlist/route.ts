import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import {
  addWishlistEntry,
  getWishlistItemsForUser,
  removeWishlistEntry,
} from '@/lib/wishlistStats';
import { getUserById } from '@/lib/users';

async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await getUserById(userId);
  if (!user) return null;
  return user;
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Login required to view wishlist' }, { status: 401 });
  }

  const items = await getWishlistItemsForUser(user.id);
  return NextResponse.json({ success: true, items });
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Login required to save wishlist items' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, image, category, price } = body;

    if (!id || !name || !image) {
      return NextResponse.json({ success: false, error: 'Invalid product data' }, { status: 400 });
    }

    await addWishlistEntry({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      product: {
        id: String(id),
        name: String(name),
        image: String(image),
        category: typeof category === 'string' ? category : undefined,
        price: typeof price === 'number' ? price : Number(price) || undefined,
      },
    });

    const items = await getWishlistItemsForUser(user.id);
    return NextResponse.json({ success: true, items });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update wishlist' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Login required' }, { status: 401 });
  }

  const productId = request.nextUrl.searchParams.get('productId');
  if (!productId) {
    return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });
  }

  await removeWishlistEntry(user.id, productId);
  const items = await getWishlistItemsForUser(user.id);
  return NextResponse.json({ success: true, items });
}