import { NextResponse } from 'next/server';
import { listPublicTdPosts } from '@/lib/tdRewards';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const posts = await listPublicTdPosts(8);
    return NextResponse.json(
      { success: true, posts },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch {
    return NextResponse.json({ success: false, posts: [] }, { status: 500 });
  }
}
