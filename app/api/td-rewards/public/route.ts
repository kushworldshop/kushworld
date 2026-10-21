import { NextRequest, NextResponse } from 'next/server';
import { listPublicTdPosts } from '@/lib/tdRewards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(24, Math.max(4, Number(request.nextUrl.searchParams.get('limit') || 16)));
    const posts = await listPublicTdPosts(limit);
    return NextResponse.json(
      { success: true, posts },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch {
    return NextResponse.json({ success: false, posts: [] }, { status: 500 });
  }
}
