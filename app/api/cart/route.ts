import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import { getUserById } from '@/lib/users';
import {
  cartTrackCookieOptions,
  createCartTrackId,
  CART_TRACK_COOKIE,
  getCartTrackId,
} from '@/lib/cartSession';
import { clearCartSnapshot, upsertCartSnapshot } from '@/lib/cartStats';

async function resolveOwner(request: NextRequest) {
  const userId = await getSessionUserId();
  if (userId) {
    const user = await getUserById(userId);
    if (user) {
      return {
        ownerKey: user.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        isGuest: false,
        guestTrackId: undefined as string | undefined,
        setTrackCookie: false,
        trackId: undefined as string | undefined,
      };
    }
  }

  let trackId = await getCartTrackId();
  let setTrackCookie = false;
  if (!trackId) {
    trackId = createCartTrackId();
    setTrackCookie = true;
  }

  return {
    ownerKey: `guest:${trackId}`,
    userId: undefined,
    userEmail: undefined,
    userName: undefined,
    isGuest: true,
    guestTrackId: trackId,
    setTrackCookie,
    trackId,
  };
}

function withTrackCookie(response: NextResponse, trackId?: string, setTrackCookie?: boolean) {
  if (setTrackCookie && trackId) {
    response.cookies.set(CART_TRACK_COOKIE, trackId, cartTrackCookieOptions());
  }
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const owner = await resolveOwner(request);
    const body = await request.json();
    const snapshot = await upsertCartSnapshot({
      ownerKey: owner.ownerKey,
      userId: owner.userId,
      userEmail: owner.userEmail,
      userName: owner.userName,
      isGuest: owner.isGuest,
      guestTrackId: owner.guestTrackId,
      items: body.items,
    });

    return withTrackCookie(
      NextResponse.json({ success: true, synced: Boolean(snapshot) }),
      owner.trackId,
      owner.setTrackCookie
    );
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to sync cart' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const owner = await resolveOwner(request);
    await clearCartSnapshot(owner.ownerKey);
    return withTrackCookie(
      NextResponse.json({ success: true }),
      owner.trackId,
      owner.setTrackCookie
    );
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to clear cart' }, { status: 500 });
  }
}